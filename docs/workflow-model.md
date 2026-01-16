# TrustFlow Workflow Model

## 1. Purpose

This document specifies the **workflow modeling abstraction** used by TrustFlow.

The goal is to define a **chain-agnostic, verifiable workflow state machine** that allows smart contracts to safely reason about real-world, off-chain processes without embedding business-specific logic on-chain.

This model is designed to be:

- Deterministic
- Verifiable
- Composable
- Minimal in on-chain state
- Explicit in trust assumptions

---

## 2. Core Abstraction

A TrustFlow workflow is defined as:
Workflow = (S, T, E, V)

Where:

- **S** = finite set of workflow states  
- **T** = allowed state transitions  
- **E** = off-chain evidence associated with transitions  
- **V** = verification rules for transitions  

The blockchain acts as the **authoritative state anchor**, while evidence validation is performed off-chain.

---

## 3. Workflow State Machine

### 3.1 States

A state represents a **globally agreed checkpoint** in the workflow lifecycle.

States must satisfy:

- Finite and enumerable
- Monotonically progressing (no implicit rollback)
- Business-agnostic

Example (illustrative):

S = { Initialized, Active, Finalized, Disputed }


State semantics are intentionally abstract to allow reuse across domains.

---

### 3.2 Transitions

A transition is defined as:

T = (Si → Sj, Preconditions, EvidenceRequirements)


Where:

- **Si → Sj** is an allowed directional transition
- Preconditions define logical constraints
- EvidenceRequirements specify what must be proven off-chain

Transitions are **not executed automatically on-chain**.  
They are **committed only after verification**.

---

## 4. Evidence Model

### 4.1 Evidence Definition

Evidence represents **off-chain facts** relevant to a transition.

Examples include:

- Time-based attestations
- Location confirmations
- Signed acknowledgements
- External system proofs
- Media or sensor hashes

Evidence is represented as:

E = (type, hash, metadata)


Only cryptographic hashes and minimal metadata are stored on-chain.

---

### 4.2 Evidence Storage

- Evidence is stored off-chain (e.g., IPFS, decentralized storage)
- On-chain contracts reference evidence by hash
- Evidence immutability is assumed once submitted

TrustFlow does **not** enforce a specific storage backend.

---

## 5. Off-Chain Verification

### 5.1 Verifier Role

The verifier is responsible for:

- Collecting required evidence
- Validating transition preconditions
- Ensuring transition ordering
- Producing a deterministic transition attestation

The verifier **does not decide outcomes**, it only validates facts.

---

### 5.2 Verification Output

The output of verification is a **Transition Proof**:

P = hash(Si, Sj, evidence_set, verifier_signature)


This proof is submitted on-chain to request a state update.

---

## 6. On-Chain State Commitment

### 6.1 State Anchor Contract

The on-chain contract:

- Stores the current workflow state
- Validates transition proofs
- Enforces allowed transition graph
- Emits canonical state events

The contract does **not** interpret evidence semantics.

---

### 6.2 Finality

Once a transition is committed on-chain:

- The state is globally final
- Subsequent transitions must build upon it
- Disputes must reference this committed state

---

## 7. Dispute Handling Model

Disputes are treated as **explicit workflow states**, not exceptions.

A dispute transition requires:

- Reference to disputed transition
- Evidence set
- Arbitration mechanism selection

Resolution results in a deterministic state transition (e.g., `Resolved`).

---

## 8. Trust Assumptions

TrustFlow makes the following assumptions explicit:

1. Evidence providers may be untrusted
2. Verifiers may be permissioned or decentralized
3. Blockchain provides neutral ordering and finality
4. Arbitration mechanisms are external to the core model

These assumptions are **configurable, not hardcoded**.

---

## 9. Chain-Agnostic Design

The workflow model is independent of:

- EVM vs Substrate
- Smart contract language
- Consensus mechanism

Only the **state anchor interface** is chain-specific.

This allows TrustFlow to be implemented as:

- Solidity contracts
- Substrate pallets
- Other stateful blockchain runtimes

---

## 10. Relationship to Reference Demo

The car rental demo is a **reference implementation** that maps domain-specific steps to this abstract model.

The workflow model itself remains:

- Domain-neutral
- Reusable
- Protocol-oriented

---

## 11. Intended Use Cases

The model is applicable to:

- Escrow-based coordination
- Delivery and logistics verification
- DAO-controlled real-world actions
- Asset usage and access control
- Multi-party service settlement

---

## 12. Non-Goals

The workflow model explicitly does not attempt to:

- Replace oracle networks
- Encode business rules on-chain
- Enforce UI or UX flows
- Solve identity or KYC

---

## 13. Summary

TrustFlow defines a minimal, verifiable workflow abstraction that allows smart contracts to safely interact with real-world processes.

It focuses on **correctness and composability**, not application-specific logic.

This document serves as the formal foundation for protocol implementations and grant-related research.

---

## References

- TrustFlow Architecture Overview
- Reference Demo Documentation
- Related grant programs including those from  
  :contentReference[oaicite:0]{index=0}
