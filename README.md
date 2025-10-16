# 🌊 Decentralized Disaster Alert Network

A Web3 platform for community-driven disaster warnings with token incentives for early reporters. Uses Stacks blockchain to ensure tamper-proof alerts, verifiable contributions, and fair reward distribution.

## ✨ Features

🚨 **Submit tamper-proof disaster alerts** with geolocation and evidence hash
💰 **Token bounties** for verified early warnings (citizen reports of floods, fires, etc.)
🗳️ **Community voting** to validate alerts and prevent spam
🔍 **Immutable audit trail** of all reports and payouts
📱 **Real-time alert feeds** for affected regions
⚖️ **Escrow rewards** to ensure fair compensation
🛡️ **Reputation system** for reporters to build trust
📊 **Analytics dashboard** for disaster response teams

## 🛠 How It Works

**For Reporters (Citizens)**
- Upload evidence (photo/video hash) + GPS coordinates
- Submit alert via `submit-alert` with category (flood, fire, etc.)
- Earn $ALERT tokens if community validates your report
- Build reputation for higher future bounties

**For Validators (Community)**
- Review alerts in your region via `get-pending-alerts`
- Vote using `validate-alert` to confirm authenticity
- Earn micro-rewards for accurate validations
- Prevent false alarms through consensus mechanism

**For Responders (NGOs/Gov)**
- Query verified alerts with `get-validated-alerts`
- Fund bounty pools via `deposit-bounty`
- Trigger automatic payouts when alerts prove valuable

**Smart Contract Architecture (8 Contracts)**

1. **AlertRegistry** - Core alert submission and metadata storage
2. **BountyEscrow** - Manages reward pools and automatic payouts
3. **ValidatorConsensus** - Voting mechanism and validation logic
4. **ReputationSystem** - Tracks reporter and validator trustworthiness
5. **TokenVault** - $ALERT token minting and distribution
6. **Geofencing** - Regional alert filtering and jurisdiction rules
7. **AlertVerifier** - Evidence validation and duplicate detection
8. **EmergencyGovernor** - Admin controls for crisis escalation

## 💡 Real-World Impact

- **Early flood warnings** from rural communities earn tokens
- **Verified fire alerts** trigger insurance payouts automatically  
- **NGOs fund bounties** for high-risk disaster zones
- **Tamper-proof records** for post-disaster aid distribution
- **Community ownership** prevents centralized censorship

## 🚀 Quick Start

```bash
# Deploy to Stacks testnet
clarity deploy AlertRegistry
clarity deploy BountyEscrow
# ... deploy remaining contracts
```

**Token Economics:**
- $ALERT tokens for rewards
- Staking for validator roles
- Governance voting on bounty parameters
- Deflationary burn on false report penalties

**Why Stacks/Clarity:**
- Fast, cheap transactions for real-time alerts
- Bitcoin finality for unalterable records
- Native sBTC integration for emergency funding
- Clear, secure smart contracts prevent exploits

This solves the **coordination problem** in disaster response by incentivizing grassroots reporting while maintaining verification integrity through blockchain consensus.
