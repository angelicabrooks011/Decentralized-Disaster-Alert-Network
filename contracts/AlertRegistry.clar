(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-CATEGORY u101)
(define-constant ERR-INVALID-GEOLOCATION u102)
(define-constant ERR-INVALID-EVIDENCE-HASH u103)
(define-constant ERR-INVALID-SEVERITY u104)
(define-constant ERR-INVALID-STATUS u105)
(define-constant ERR-ALERT-ALREADY-EXISTS u106)
(define-constant ERR-ALERT-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u109)
(define-constant ERR-INVALID-VALIDATION-COUNT u110)
(define-constant ERR-INVALID-BOUNTY u111)
(define-constant ERR-ALERT-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-ALERTS-EXCEEDED u114)
(define-constant ERR-INVALID-ALERT-TYPE u115)
(define-constant ERR-INVALID-REPORTER u116)
(define-constant ERR-INVALID-VALIDATOR u117)
(define-constant ERR-INVALID-REGION u118)
(define-constant ERR-INVALID-PROOF u119)
(define-constant ERR-INVALID-RESOLUTION u120)

(define-data-var next-alert-id uint u0)
(define-data-var max-alerts uint u10000)
(define-data-var submission-fee uint u100)
(define-data-var authority-contract (optional principal) none)

(define-map alerts
  uint
  {
    reporter: principal,
    timestamp: uint,
    category: (string-ascii 20),
    geolocation: { lat: int, lon: int },
    evidence-hash: (buff 32),
    severity: uint,
    status: (string-ascii 10),
    validation-count: uint,
    bounty-earned: uint,
    alert-type: (string-ascii 20),
    reporter-rep: uint,
    region: (string-ascii 50),
    proof-level: uint,
    resolution-time: uint
  }
)

(define-map alerts-by-hash
  (buff 32)
  uint)

(define-map alert-updates
  uint
  {
    update-category: (string-ascii 20),
    update-severity: uint,
    update-status: (string-ascii 10),
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-alert (id uint))
  (map-get? alerts id)
)

(define-read-only (get-alert-updates (id uint))
  (map-get? alert-updates id)
)

(define-read-only (is-alert-registered (hash (buff 32)))
  (is-some (map-get? alerts-by-hash hash))
)

(define-private (validate-category (cat (string-ascii 20)))
  (if (or (is-eq cat "FLOOD") (is-eq cat "FIRE") (is-eq cat "EARTHQUAKE") (is-eq cat "TORNADO"))
      (ok true)
      (err ERR-INVALID-CATEGORY))
)

(define-private (validate-geolocation (geo { lat: int, lon: int }))
  (if (and (>= (get lat geo) -90) (<= (get lat geo) 90) (>= (get lon geo) -180) (<= (get lon geo) 180))
      (ok true)
      (err ERR-INVALID-GEOLOCATION))
)

(define-private (validate-evidence-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-EVIDENCE-HASH))
)

(define-private (validate-severity (sev uint))
  (if (and (>= sev u1) (<= sev u10))
      (ok true)
      (err ERR-INVALID-SEVERITY))
)

(define-private (validate-status (stat (string-ascii 10)))
  (if (or (is-eq stat "PENDING") (is-eq stat "VALIDATED") (is-eq stat "REJECTED") (is-eq stat "RESOLVED"))
      (ok true)
      (err ERR-INVALID-STATUS))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-alert-type (atype (string-ascii 20)))
  (if (or (is-eq atype "CITIZEN") (is-eq atype "SENSOR") (is-eq atype "OFFICIAL"))
      (ok true)
      (err ERR-INVALID-ALERT-TYPE))
)

(define-private (validate-reporter-rep (rep uint))
  (if (<= rep u1000)
      (ok true)
      (err ERR-INVALID-UPDATE-PARAM))
)

(define-private (validate-region (reg (string-ascii 50)))
  (if (and (> (len reg) u0) (<= (len reg) u50))
      (ok true)
      (err ERR-INVALID-REGION))
)

(define-private (validate-proof-level (proof uint))
  (if (<= proof u5)
      (ok true)
      (err ERR-INVALID-PROOF))
)

(define-private (validate-resolution-time (res uint))
  (if (> res u0)
      (ok true)
      (err ERR-INVALID-RESOLUTION))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-alerts (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-ALERTS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-alerts new-max)
    (ok true)
  )
)

(define-public (set-submission-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set submission-fee new-fee)
    (ok true)
  )
)

(define-public (submit-alert
  (category (string-ascii 20))
  (geolocation { lat: int, lon: int })
  (evidence-hash (buff 32))
  (severity uint)
  (alert-type (string-ascii 20))
  (reporter-rep uint)
  (region (string-ascii 50))
  (proof-level uint)
  (resolution-time uint)
)
  (let (
        (next-id (var-get next-alert-id))
        (current-max (var-get max-alerts))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-ALERTS-EXCEEDED))
    (try! (validate-category category))
    (try! (validate-geolocation geolocation))
    (try! (validate-evidence-hash evidence-hash))
    (try! (validate-severity severity))
    (try! (validate-alert-type alert-type))
    (try! (validate-reporter-rep reporter-rep))
    (try! (validate-region region))
    (try! (validate-proof-level proof-level))
    (try! (validate-resolution-time resolution-time))
    (asserts! (is-none (map-get? alerts-by-hash evidence-hash)) (err ERR-ALERT-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get submission-fee) tx-sender authority-recipient))
    )
    (map-set alerts next-id
      {
        reporter: tx-sender,
        timestamp: block-height,
        category: category,
        geolocation: geolocation,
        evidence-hash: evidence-hash,
        severity: severity,
        status: "PENDING",
        validation-count: u0,
        bounty-earned: u0,
        alert-type: alert-type,
        reporter-rep: reporter-rep,
        region: region,
        proof-level: proof-level,
        resolution-time: resolution-time
      }
    )
    (map-set alerts-by-hash evidence-hash next-id)
    (var-set next-alert-id (+ next-id u1))
    (print { event: "alert-submitted", id: next-id })
    (ok next-id)
  )
)

(define-public (update-alert
  (alert-id uint)
  (update-category (string-ascii 20))
  (update-severity uint)
  (update-status (string-ascii 10))
)
  (let ((alert (map-get? alerts alert-id)))
    (match alert
      a
        (begin
          (asserts! (is-eq (get reporter a) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-category update-category))
          (try! (validate-severity update-severity))
          (try! (validate-status update-status))
          (map-set alerts alert-id
            {
              reporter: (get reporter a),
              timestamp: block-height,
              category: update-category,
              geolocation: (get geolocation a),
              evidence-hash: (get evidence-hash a),
              severity: update-severity,
              status: update-status,
              validation-count: (get validation-count a),
              bounty-earned: (get bounty-earned a),
              alert-type: (get alert-type a),
              reporter-rep: (get reporter-rep a),
              region: (get region a),
              proof-level: (get proof-level a),
              resolution-time: (get resolution-time a)
            }
          )
          (map-set alert-updates alert-id
            {
              update-category: update-category,
              update-severity: update-severity,
              update-status: update-status,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "alert-updated", id: alert-id })
          (ok true)
        )
      (err ERR-ALERT-NOT-FOUND)
    )
  )
)

(define-public (get-alert-count)
  (ok (var-get next-alert-id))
)

(define-public (check-alert-existence (hash (buff 32)))
  (ok (is-alert-registered hash))
)