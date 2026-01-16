# TrustFlow

**TrustFlow** is a protocol and reference implementation for modeling real-world, multi-party workflows as **verifiable state machines**, with final state commitments anchored on-chain.

It is designed as **middleware between off-chain execution and on-chain settlement**, enabling smart contracts to reason about complex real-world processes without embedding application-specific logic.

---

## Motivation

Smart contracts excel at deterministic execution but lack native visibility into off-chain processes such as:

- Multi-step service delivery
- Human-in-the-loop confirmations
- Physical-world events
- Dispute-prone workflows involving multiple parties

As a result, most applications re-implement ad-hoc verification logic using centralized servers or opaque oracles.

**TrustFlow addresses this gap** by providing a reusable protocol abstraction for:
- Workflow state modeling
- Off-chain evidence collection
- Deterministic verification
- On-chain state finalization

---

## Design Goals

- **Protocol-first, not application-first**
- **Composable workflow primitives**
- **Minimal on-chain footprint**
- **Auditable and dispute-aware**
- **Chain-agnostic architecture**

TrustFlow is intentionally not a SaaS product or UI-driven application.  
It provides **interfaces, reference implementations, and specifications** that other protocols and applications can build upon.

---

## High-Level Architecture

TrustFlow separates concerns into three layers:

1. **Workflow Definition Layer**
2. **Off-Chain Verification Layer**
3. **On-Chain Settlement Layer**

Each workflow is modeled as a directed state machine.  
State transitions are verified off-chain and finalized on-chain.

---

## Core Components

### 1. On-Chain Layer (Settlement & Dispute)

Smart contracts provide minimal, generic primitives:

#### Escrow Contract
- Lock and release funds based on verified workflow completion
- Refund and timeout handling
- Fee abstraction (optional)

#### Workflow State Contract
- Commit finalized workflow states
- Enforce valid state transitions
- Emit canonical events

#### Dispute Contract
- Dispute submission
- Evidence hash anchoring
- Arbitration hooks (DAO / multisig / external resolvers)

> On-chain logic is intentionally minimal and generic.

---

### 2. Off-Chain Verification Layer

Off-chain agents are responsible for:

- Collecting workflow evidence
- Verifying state transitions
- Aggregating proofs
- Submitting finalized states on-chain

This layer may include:

- Workflow verifiers
- Event listeners
- Evidence processors
- Dispute evidence collectors

Evidence may include:
- GPS traces
- Timestamps
- Signed confirmations
- Media hashes
- External system attestations

---

### 3. Storage Layer

TrustFlow distinguishes between:

- **On-chain data**
  - State roots
  - Payment records
  - Dispute outcomes

- **Off-chain indexed data**
  - Workflow metadata
  - Execution logs

- **Distributed storage (e.g. IPFS)**
  - Large evidence artifacts
  - Media files
  - Detailed execution traces

Only hashes and minimal commitments are stored on-chain.

---

## Reference Implementation

The current repository includes a **reference implementation** demonstrating:

- Escrow-based workflow settlement
- Multi-party confirmation flows
- Dispute-aware execution
- Off-chain verification with on-chain finalization

The initial demo scenario uses a **rental / service workflow** purely as an example.  
The protocol itself is **domain-agnostic**.

---

## Example Workflow (Abstract)

1. Workflow initialized with parameters
2. Funds locked in escrow
3. Off-chain execution progresses through defined states
4. Evidence collected per transition
5. Verifier validates transitions
6. Final state committed on-chain
7. Escrow released or disputed

---

## Repository Structure

## Reference Demo: Car Rental Workflow

The current demo uses a **car rental scenario** as a *reference implementation* to demonstrate TrustFlow’s capabilities.  
This is **not** a ride-hailing or rental product, but a concrete workflow example.

### Why Car Rental?

Car rental workflows exhibit characteristics common to many real-world processes:

- Multi-party coordination (renter, owner, platform)
- Conditional payments
- Physical-world verification
- Dispute-prone edge cases

---

### Rental Workflow as a State Machine


Each transition requires verifiable off-chain evidence before advancing.

---

### Example Flow

1. **Reservation**
   - Renter selects vehicle and rental period
   - Funds are locked in escrow on-chain

2. **Pickup Confirmation**
   - Vehicle pickup is confirmed via off-chain evidence
   - Verifier validates location / identity / timestamp

3. **Rental Period**
   - Vehicle usage is tracked off-chain
   - No on-chain interaction required

4. **Return Confirmation**
   - Return location and condition are verified
   - Evidence is submitted to the verifier

5. **Settlement**
   - Verifier finalizes workflow state
   - On-chain contract releases funds
   - Platform fee (if any) is deducted

6. **Dispute (Optional)**
   - Evidence hashes are submitted
   - Arbitration or DAO-based resolution can be triggered

---

## Core Components

### On-Chain Contracts

- **Escrow Contract**
  - Locks funds at workflow start
  - Releases or refunds based on finalized state

- **Workflow State Contract**
  - Stores minimal state commitments
  - Emits events for off-chain listeners

- **Dispute Contract**
  - Accepts evidence hashes
  - Executes arbitration outcomes

---

### Off-Chain Services

- **Workflow Verifier**
  - Validates state transitions
  - Enforces workflow rules

- **Evidence Collector**
  - Aggregates GPS, timestamps, signatures
  - Stores large artifacts off-chain (e.g., IPFS)

- **Blockchain Listener**
  - Syncs on-chain events
  - Triggers off-chain execution steps

---

## Project Structure

