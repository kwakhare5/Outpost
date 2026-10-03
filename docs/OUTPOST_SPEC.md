# Outpost — Master Specification & Operational Case Study

**Platform:** Outpost Autonomous Quick-Commerce Inventory Replenishment Decision Engine & Execution Platform  
**Target Audience:** Engineering VPs, Directors of Supply Chain, and Fulfillment Tech Leads (Zepto, Blinkit, Swiggy Instamart, BigBasket, Swish, Flipkart Minutes)  
**Repository:** [github.com/kwakhare5/Outpost](https://github.com/kwakhare5/Outpost)  
**Live Cockpit:** [https://dark-store-operator.vercel.app](https://dark-store-operator.vercel.app)  

---

## 1. Executive Summary, Vision & 30-Second Elevator Pitch

### The 30-Second Elevator Pitch
> *"In 10-minute quick commerce, dark stores (2,000–4,000 sq ft) turn inventory 4–6x faster than supermarkets with zero backroom buffer. As documented by Swiggy Instamart and Blinkit engineering, raw sales logs suffer from 'availability bias' (censored demand during stockouts), while unconstrained replenishment risks catastrophic 'dump-related cost burns' (spoilage write-offs).*  
> *Rather than treating inventory replenishment as an opaque, stochastic ML problem, I built **Outpost**: a deterministic decision engine for a 5-node Mumbai dark store network. It couples Holt linear demand forecasting and discrete FIFO batch tracking with an auditable Level-2 human approval gate (idempotency, stale-state checks, and in-transit RFC lead times). The platform strictly conserves physical mass ($140u \rightarrow 140u$, $\Delta = 0.00$) and features an interactive Operations Test Lab where operators can stress-test real demand shocks, supplier delays, and custom store parameters."*

### Product Vision & Engineering Purpose
This repository is engineered as an **authoritative technical case study**, not a generic commercial SaaS dashboard or speculative AI pitch. It provides a concrete, auditable solution to the central dilemma of quick-commerce unit economics: balancing stockout avoidance against inventory spoilage under severe physical space and lead-time constraints.

### Core Architecture & Autonomy Model
1. **Level-2 Autonomy Gate (Human-in-the-Loop):** Never execute high-consequence stockout interventions (`TRANSFER`, `REORDER`) silently. The engine analyzes multi-store telemetry, evaluates candidate actions, and formats recommendations with full explainability (16 explicit reason codes). A human operator must authorize every transit dispatch or purchase order before inventory state is mutated.
2. **Physical Realism & Transit Horizons:** Stock replenishments never teleport instantly. Reorders to Regional Fulfilment Centres (RFCs) and inter-store van transfers model physical road distance, highway congestion, and lead times. Stock arrives and increments on-hand inventory strictly upon verified arrival events.
3. **Auditable Safety Invariants:** The execution pipeline enforces double-checked pre-execution validation, stale-state detection, idempotency tokens, and recovery fallbacks to prevent phantom inventory or duplicate execution.
4. **Transparent Forecasting:** Forecasting utilizes Holt linear double exponential smoothing with empirical rolling MAE and WAPE error tracking over a 3-day holdout backtest, rejecting ungrounded "black box AI" claims.

> **Honesty & Simulation Boundary:** All dark store nodes (Bandra West, Andheri East, Powai Galleria, Lower Parel, Thane West), van corridors, and batch expiries are evaluated against a **deterministic simulator stated upfront**. Demand volume profiles are grounded in the real-world Kaggle Favorita Grocery Sales dataset with explicit intraday rate tables.

---

## 2. Industry Ground Truth & Verified Quotes

The design choices in Outpost directly address the core operational bottlenecks documented by engineering leaders across India's quick-commerce sector:

### A. The "Availability Bias" & Censored Demand Trap (Swiggy Instamart Engineering)
* **Source:** *Swiggy Bytes — Tech Blog*, "Adaptive Metric Alignment for Demand Forecasting in Swiggy Instamart" (May 2023)
* **Authors:** Priyanka Banik (Lead Data Scientist), Shubha Shedthikere (Co-Author)
* **The Engineering Reality:**  
  When an SKU stocks out, recorded sales drop to zero. Standard machine learning models optimized for offline wMAPE treat these zero-sales intervals as zero demand. This creates a destructive feedback loop of systematic under-forecasting and chronic under-replenishment:
  > *"In use cases like ours, we only have sales data, which represents 'true' demand when availability=1, but represents truncated demand when availability<1, and we need to predict the demand to improve availability of the SKU and reduce wastage. In such cases, using wMAPE w.r.t sales as target poses serious drawbacks... wMAPE w.r.t sales data leads to under-prediction: wMAPE gives lower average error when the model gives demand prediction closer to the corresponding sales. This would serve as a good metric to evaluate the model performance in case of high availability but would lead to selection of models which under-predict in case of low availability. This would lead to further reduction in availability of the SKU when used for demand planning."*
* **Outpost Approach:**  
  Outpost explicitly separates **requested demand** from **fulfilled sales** and tracks **lost sales** independently (`requested == fulfilled + lost`). Demand forecasting uses transparent Holt linear models with rolling MAE/WAPE backtesting, preventing historical stockouts from censoring replenishment signals.

---

### B. Stockouts vs. "Dump-Related Cost Burns" (Blinkit Engineering)
* **Source:** *Lambda by Blinkit*, "In Focus: Utkarsh Shukla" & "First 12 Months at Blinkit" (Manik Chawla, Abhishek M)
* **The Engineering Reality:**  
  Dark stores have no customer walk-in bargain aisles to clear near-expiry inventory. Blinkit engineering emphasizes that replenishment is a razor-thin trade-off between losing customers to rival apps and suffering catastrophic physical dump write-offs:
  > *"Inventory planning and demand prediction are the central challenges in quick commerce; solving them is about minimizing dump-related cost burns [losses from spoiled or expired inventory] while simultaneously driving down out-of-stock instances."*  
  > *"Replenishing stock at Dark Stores only a few times a day is insufficient... Continuous Replenishment is a 0–1 problem. Just like moving from weekly deployments to CI/CD, dark stores require continuous inventory flow with automated, on-demand triggers when availability dips."*
* **Outpost Approach:**  
  Outpost models physical stock as **discrete FIFO batches** with explicit expiration countdowns (`expiresInHours`). Rather than letting stock silently expire, the system proactively recommends inter-store balancing transfers or proposed discount markdowns before items enter critical decay horizons.

---

### C. Zero Backroom Buffers & Inventory Velocity (Zepto Leadership)
* **Sources:** Aadit Palicha (Co-Founder & CEO, Zepto) & Karthic Somalinga (SVP Engineering, Fulfilment)
* **The Engineering Reality:**  
  Micro-warehouses operate under extreme spatial and temporal velocity:
  > Micro-warehouses (2,000–4,000 sq ft) turn inventory **4–6x faster** than traditional supermarkets. With space physically constrained, dark stores operate with zero backroom buffer. Exceeding **1.5% shrinkage of GMV** destroys store-level contribution margins, while stockouts above **5% OOS** trigger instant cross-app user churn.
* **Outpost Approach:**  
  Outpost introduces a **Level-2 Human Approval Gate**. The engine computes replenishment math, calculates lead times, and verifies stock balances, but requires verified manager authorization before dispatching transit vans or generating purchase orders. This prevents runaway bullwhip reorders and keeps total network stock strictly conserved ($140u \rightarrow 140u$, $\Delta = 0.00$).

---

## 3. Quantitative Operational Benchmarks

The operational thresholds and risk boundaries in Outpost are calibrated against empirical quick-commerce operational benchmarks:

| Operational Variable | Real-World Industry Benchmark | Operational Significance & System Defense |
| :--- | :--- | :--- |
| **Dark Store Footprint** | **2,000 – 4,000 sq ft** | Micro-warehouses housing 2,500–8,000 SKUs; zero backroom storage requires continuous, accurate replenishment. |
| **Target Stockout Ceiling** | **< 3.0%** across active SKUs | Industry standard for top-tier fulfillment and retention. |
| **Customer Churn Redline** | **> 5.0% OOS** | Immediate platform abandonment to rival apps (Zepto $\leftrightarrow$ Blinkit $\leftrightarrow$ Instamart) when staple SKUs are missing. |
| **Demand Shock OOS Spikes** | Up to **30% – 70% OOS** | Unhedged surges caused by severe weather (monsoon downpours) or major sporting events (IPL boundaries). |
| **Shrinkage & Spoilage Ceiling** | **< 0.5% – 1.5% of GMV** | Exceeding 1.5% turns dark store contribution margins negative; necessitates proactive FIFO batch markdowns. |
| **Inventory Turnover Rate** | **4x – 6x faster** than traditional retail | High-velocity micro-fulfillment requiring continuous intraday stock rebalancing. |

### Operational Logic & Threshold Calibration
- **Stockout Horizon Alerting:** The risk engine continuously computes hours-to-stockout ($H = \text{Current Stock} / \text{Demand Rate}$). When $H < 4.0\text{ hours}$ (well before reaching the 5.0% OOS churn redline), proactive replenishment recommendations are formulated.
- **Spoilage Horizon Alerting:** Batches approaching expiration within critical lead time horizons ($T_{\text{expiry}} < \text{Threshold}$) trigger inter-store transfer proposals to high-velocity nodes or proposed markdown incentives, keeping network shrinkage strictly below the 1.5% GMV ceiling.

---

## 4. System Architecture & Physical Invariants

Outpost coordinates four tightly coupled architectural layers to enforce operational safety and domain invariants:

```
┌────────────────────────────────────────────────────────────────────────┐
│               Operations Deck (Next.js 16 + Tailwind CSS)              │
│  - Spatial Mumbai Fleet Mesh (5 Hubs)    - Candidate Action Drawer     │
│  - Human-in-the-Loop Approval Gate       - Real-Time Simulation Clock  │
│  - Operations Test Lab (Shock Controls)  - CSV WMS Export Engine       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ REST / Server-Sent Events / SSE
┌──────────────────────────────────▼─────────────────────────────────────┐
│                       FastAPI Operational Core                         │
│  - Deterministic Poisson/Rate Table     - Physical FIFO Batch Ledger   │
│  - Conservation of Mass Enforcer        - Event Bus & Audit Logging    │
│  - Regional Fulfilment Centre Interface - Idempotent Approval Router   │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
┌───────────────────▼──────────────┐   ┌────────────▼────────────────────┐
│   Intelligence & Forecasting     │   │   LangGraph Execution State     │
│  - Holt Linear (Double Smoothing)│   │  - Node 1: Pre-Check & Locks    │
│  - 3-Day Holdout Model Selection │   │  - Node 2: Capacity & Invariant │
│  - Rolling MAE & WAPE Reporting  │   │  - Node 3: FIFO Batch Mutation  │
│  - 7-D Hazard / Lead Time Score  │   │  - Node 4: Event Bus Audit      │
│  - Decoupled Sales Accounting    │   │  - Node 5: Recovery Handler     │
└──────────────────────────────────┘   └─────────────────────────────────┘
```

### Four Core Physical Invariants

#### 1. Conservation of Mass Invariant ($140u \rightarrow 140u$, $\Delta = 0.00$)
When 20 units of milk are transferred from Bandra West (`ST-02`) to Lower Parel (`ST-04`), the stock is deducted from the source batch and placed in an in-transit van (`Van #MH-02`).
- Network inventory remains strictly conserved at **140 units** ($\Delta = 0.00$) at every millisecond during transit.
- Destination inventory increments only after the physical arrival event fires.
- Phantom stock creation or loss is mathematically impossible.

#### 2. Discrete FIFO Batch Ledger
Physical inventory is never tracked as a scalar integer. It is modeled as discrete manufacturing batches with explicit expiration dates (`expiresInHours`).
- All customer demand orders and outbound transfers deduct from the oldest eligible batches first (First-In, First-Out).
- Residual shelf life determines risk scoring and markdown proposals.

#### 3. Realistic RFC Inbound Lead Times & Transit ETAs
Replenishment orders are not instant teleportations:
- **Purchase Orders (POs):** Reorders to Regional Fulfilment Centres (e.g. Bhiwandi RFC) require realistic highway lead times (2.5 hours baseline; scalable up to 8.5 hours during logistics delays). Inventory increments only when the truck physically unloads.
- **Transfers:** Inter-store movements follow realistic Mumbai road corridors (e.g. Bandra-Worli Sea Link 18m, Western Express Highway 25m).

#### 4. Sales Accounting & Decoupled Demand Signals
- Demand generation separates **requested demand**, **fulfilled sales**, and **lost sales** (`requested == fulfilled + lost`).
- Unfulfilled demand during stockouts is recorded as lost sales rather than suppressed demand, eliminating the "availability bias" that corrupts conventional supply chain models.

#### 5. Holt Linear Forecasting & Rolling Error Telemetry
- Uses Holt linear double exponential smoothing (level + trend), rejecting opaque ML hype.
- System continuously evaluates Holt linear against a 14-day moving average over a 3-day holdout set, selecting the model with lower MAE.
- Surfaces rolling **MAE** and volume-weighted **WAPE** ($\frac{\sum |a - p|}{\sum a} \times 100$) directly to operators.

#### 6. Level-2 Autonomy Approval Gate
- Recommendations require explicit operator authorization (`/api/recommendations/{id}/approve` or `/api/agent/execute/{id}`).
- Double-checks verify current store stock before committing state changes.
- Idempotency tokens ensure duplicate approval requests produce zero side effects.
- Stale recommendations (e.g. source store stock depleted while decision was queued) are rejected and routed to human review.

#### 7. Hybrid Dual-Mode Client Integration
- Frontend seamlessly connects to live FastAPI backend (`http://localhost:8000`) and the 5-node LangGraph agent state machine.
- Gracefully falls back to a deterministic client-side engine if running in disconnected preview environments, ensuring zero downtime for reviewers.

---

## 5. Operations Test Lab & Stress Scenario Engine

Outpost includes a dedicated, interactive **Operations Test Lab** (`components/dashboard/TestLabModal.tsx`) built directly into the operations deck, allowing operators and visiting engineers to test real quick-commerce shocks and inspect immediate system responses:

```
┌────────────────────────────────────────────────────────────────────────┐
│                       OPERATIONS TEST LAB                              │
│                                                                        │
│  [ IPL Demand Rush ]  ─────────●────────────── 3.2x Surge               │
│  [ RFC Truck Delay ]  ─────────────────●────── +2.5h Congestion         │
│                                                                        │
│  Store Stock & Demand Overrides:                                       │
│  - Bandra West:    [ 12 u ] Stock  |  [ 18 u/h ] Demand  → Horizon: 0.7h│
│  - Lower Parel:    [ 45 u ] Stock  |  [  8 u/h ] Demand  → Horizon: 5.6h│
│                                                                        │
│  [ Apply Shock Parameters ]         [ Export WMS CSV Snapshot ]        │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Capabilities of the Test Lab:
1. **IPL Demand Rush Slider (1.0x – 5.0x):**  
   Dynamically scales customer order velocity across the 5 Mumbai dark stores, simulating high-velocity match-night snacking surges. Operators observe immediate upward revisions in Holt linear forecasts and proactive inter-store transfer proposals.
2. **RFC Truck Delay Slider (+0.0h – +6.0h):**  
   Simulates highway logistics bottlenecks on the Bhiwandi / Mumbai freight corridors. Extends Purchase Order transit ETAs and tests whether local dark stores have sufficient safety stock buffers to avoid stockout churn.
3. **Custom On-Hand Stock & Demand Overrides:**  
   Allows operators to inject custom stock levels and active hourly demand rates for individual dark stores, facilitating edge-case testing (e.g. testing store response when on-hand stock drops below 5 units).
4. **Dynamic Stockout Horizon Calculation:**  
   Computes instant hours-to-stockout ($H = \text{Stock} / \text{Demand}$) in real time as sliders and inputs change.
5. **WMS CSV Snapshot Export (`outpost_mumbai_darkstores.csv`):**  
   Enables one-click generation and download of complete operational snapshots, detailing store identifiers, inventory balances, replenishment statuses, active orders, and calculated risk horizons.

---

## 6. Done Criteria & Technical Standards

The Outpost repository satisfies rigorous engineering standards across three evaluation dimensions:

### A. The Recruiter Test (Under 30 Seconds)
Within 30 seconds of landing on the repository, a technical recruiter can locate:
- **A working public deployment link:** [https://dark-store-operator.vercel.app](https://dark-store-operator.vercel.app)
- **A demo walkthrough video link:** IPL demand spike and approval workflow.
- **A single clear sentence explaining the platform:** Auditable, deterministic decision engine for quick-commerce dark stores with Level-2 human approval.
- **An upfront statement of the simulated setup:** Explicit declaration of the simulated 5-node Mumbai fleet grounded in Favorita grocery demand.

### B. Staff Engineer Code Review Standards
A deep codebase review verifies the following technical invariants:
- **Conservation of Mass:** Strict conservation ($140u \rightarrow 140u$, $\Delta = 0.00$) verified across all transfer state transitions.
- **Zero Inventory Teleportation:** Purchase orders and transfers respect physical transit ETAs; inventory increments only upon arrival events.
- **No Invented Scoreboards:** Zero fake impact scoreboards or unmeasured claims. Every metric represents actual simulated transactions or empirical backtests.
- **Forecasting Honesty:** Forecasts are consistently labeled **Holt linear**; rolling MAE and WAPE are computed from real holdout residuals.
- **Sales Reconciliation:** Requested demand, fulfilled units, and lost sales reconcile with 100% mathematical precision (`requested == fulfilled + lost`).
- **Deterministic Reproducibility:** Every run is seeded and produce identical state transitions under fixed inputs.
- **100% Green Verification Suite:**
  - **Pytest Suite:** 123/123 tests passing (`backend/tests/`).
  - **E2E Suite:** 10/10 tests passing (`tests/e2e/e2e_verification_report.json`).
  - **Production Bundle:** Clean Next.js 16 build (`npm run build`) with zero static or Turbopack errors.
  - **Linter:** 0 ESLint warnings or errors (`npm run lint`).

### C. The Honesty Test
- Simulated setup is stated upfront in the first two paragraphs of the README and documentation.
- The role and boundaries of the Kaggle Favorita dataset are documented transparently.
- Discount actions are explicitly labeled: *"Proposed action. POS integration is not implemented."*
- Zero speculative ROI or gross margin claims are made without empirical trial data.

---

## 7. Targeted Executive Outreach Machine

Outreach begins only after public deployment and video completion. Messages are personalized, domain-specific, and reference concrete engineering trade-offs rather than generic networking pitches.

### Sequencing & Execution Rules
1. **Target Ratio:** 3–5 contacts per company, approached sequentially.
2. **Channel:** LinkedIn DM as primary channel; verified email (`future@blinkit.com`) as secondary channel.
3. **Cadence:**
   - Day 1: Reach out to the Engineering Manager or Technical Lead closest to supply chain, fulfillment, or forecasting.
   - Day 1 (in parallel): Connect with Campus Hiring / Talent Acquisition specialist.
   - Day 5–7 (if no response): Escalate to Director of Engineering or VP of Supply Chain Tech.
   - Day 10–12: Reach out to CTO or Technical Co-Founder.

---

### Ranked Target Companies & Verified Leadership

#### 1. Swish (High-Velocity Micro-Hubs)
* **Why First:** Nimble, fast-scaling team (~150 people) with direct access to technical founders who read inbound messages.
* **Key Contacts:**
  - **Saran S** (Technical Co-Founder): [linkedin.com/in/saranonearth](https://www.linkedin.com/in/saranonearth)
  - **Ujjwal Sukheja** (Co-Founder, Hiring): [linkedin.com/in/ujjwalsukheja](https://www.linkedin.com/in/ujjwalsukheja)
  - **Aniket Shah** (CEO): [linkedin.com/in/aniketshah30](https://www.linkedin.com/in/aniketshah30)
* **Outreach Sequence:** Saran S $\rightarrow$ Ujjwal Sukheja $\rightarrow$ Aniket Shah.

#### 2. Zepto (Hyperlocal Fulfillment & Velocity Leader)
* **Why Second:** Highest alignment with inventory velocity, zero-buffer dark stores, and fulfillment engineering.
* **Key Contacts:**
  - **Karthic Somalinga** (SVP Engineering, Fulfilment): [linkedin.com/in/karthicsomalinga](https://www.linkedin.com/in/karthicsomalinga) *(Top priority target; regularly publishes on forecasting and supply-chain tech)*
  - **Deepak Jain** (Director of Engineering): [linkedin.com/in/deepcoder](https://in.linkedin.com/in/deepcoder)
  - **Jitendra Singh** (Director of Engineering): [linkedin.com/in/jitendra-singh-48678253](https://in.linkedin.com/in/jitendra-singh-48678253)
  - **Nikhil Mittal** (CTO): [linkedin.com/in/nikhilkmittal](https://www.linkedin.com/in/nikhilkmittal)
  - **Neha Mahajan** (Talent Acquisition): [linkedin.com/in/neha-mahajan-40389829](https://in.linkedin.com/in/neha-mahajan-40389829)
  - **Siwangi Kumari** (Campus Hiring): [linkedin.com/in/siwangi0206](https://in.linkedin.com/in/siwangi0206)
* **Outreach Sequence:** Karthic Somalinga $\rightarrow$ Deepak Jain $\rightarrow$ Nikhil Mittal; parallel track with Siwangi Kumari.

#### 3. Blinkit (Continuous Replenishment & Zomato Quick-Commerce)
* **Why Third:** Published extensively on continuous replenishment and dump-cost challenges; verified company hiring inbox.
* **Key Contacts:**
  - **Sajal Gupta** (CTO): [linkedin.com/in/sajal-gupta-4b966742](https://www.linkedin.com/in/sajal-gupta-4b966742)
  - **Akansha Sharma** (Talent Acquisition): [linkedin.com/in/akansha-sharma-16b8a7148](https://in.linkedin.com/in/akansha-sharma-16b8a7148)
  - **Nivedita Semwal** (Talent Acquisition): [linkedin.com/in/niveditasemwal](https://in.linkedin.com/in/niveditasemwal)
  - **Raman Sharma** (Campus Hiring): [linkedin.com/in/raman-sharma-882b41204](https://www.linkedin.com/in/raman-sharma-882b41204)
* **Verified Inbox:** `future@blinkit.com` *(Submit portfolio, resume, and case study)*.
* **Outreach Sequence:** Sajal Gupta with parallel submission to `future@blinkit.com` and recruiter connection.

#### 4. Swiggy Instamart (Supply Chain Intelligence)
* **Why Fourth:** Pioneered research on availability bias in quick-commerce demand forecasting.
* **Key Contacts:**
  - **Samkit Jain** (Engineering Manager, Supply Chain): [linkedin.com/in/samsamkit](https://www.linkedin.com/in/samsamkit)
  - **Tapan Ghia** (AVP Engineering): [linkedin.com/in/tapanghia](https://in.linkedin.com/in/tapanghia)
  - **Nitesh Garg** (CTO, Instamart): [linkedin.com/in/niteshgarg](https://in.linkedin.com/in/niteshgarg)
  - **Manasa M.N.** (Campus/Early Careers): [linkedin.com/in/manasa-m-n-35a3a825](https://www.linkedin.com/in/manasa-m-n-35a3a825)
  - **Anubhuti Kala** (Talent Acquisition): [linkedin.com/in/anubhutikala](https://www.linkedin.com/in/anubhutikala)
* **Outreach Sequence:** Samkit Jain $\rightarrow$ Tapan Ghia $\rightarrow$ Nitesh Garg; parallel track with Manasa M.N.

#### 5. BigBasket / BB Now (Micro-Warehouse Fulfillment)
* **Why Fifth:** Established large-scale dark store logistics with formal early-careers routes.
* **Key Contacts:**
  - **Siva Kumar Tangudu** (Head of Engineering): [linkedin.com/in/tsiva](https://www.linkedin.com/in/tsiva)
  - **Keshav Kumar** (CPTO): [linkedin.com/in/kumarkeshav](https://www.linkedin.com/in/kumarkeshav)
  - **Yogesh Soni** (Quick-Commerce Hiring): [linkedin.com/in/yogesh-soni-a1347b22](https://www.linkedin.com/in/yogesh-soni-a1347b22)
  - **Swetha H S** (Talent Acquisition): [linkedin.com/in/swethahs](https://www.linkedin.com/in/swethahs)
* **Formal Portal:** [careers.bigbasket.com](https://careers.bigbasket.com)

#### 6. Flipkart Minutes (Rapid Grocery Logistics)
* **Why Sixth:** Fast-growing quick-commerce arm with dedicated student and engineering programs.
* **Key Contacts:**
  - **Nilaksh Bajpai** (VP Engineering): [linkedin.com/in/nilakshbajpai](https://www.linkedin.com/in/nilakshbajpai)
  - **Privendra Singh** (Director of Engineering): [linkedin.com/in/privendra-singh](https://www.linkedin.com/in/privendra-singh)
  - **Sai Shiva Prasad Konda** (Early Careers / GRiD): [linkedin.com/in/shivaprasad1](https://www.linkedin.com/in/shivaprasad1)
* **Formal Portal:** [flipkartcareers.com/students](https://www.flipkartcareers.com/students)

---

### Personalized Outreach Pitch Scripts

#### 1. Pitch to Zepto (Karthic Somalinga / Deepak Jain)
> *"Hi Karthic — I’ve followed your posts on fulfillment velocity and shrinkage prevention across Zepto's zero-buffer dark stores.*  
> *Rather than building a generic AI dashboard, I built **Outpost**: an auditable inventory decision engine for a 5-node Mumbai dark store network. It tackles the exact operational tension between stockout-driven churn (>5% cliff) and dump-related write-offs (<1.5% GMV ceiling) using Holt linear forecasting, discrete FIFO batches, and an auditable Level-2 human approval gate with strict mass conservation ($140u \rightarrow 140u$).*  
> *It also features an interactive Operations Test Lab to stress-test IPL demand surges and Bhiwandi truck delays.*  
> *Live Demo: https://dark-store-operator.vercel.app | Code: https://github.com/kwakhare5/Outpost*  
> *Would value 5 minutes of your thoughts on our human approval gate and transit ETA design."*

#### 2. Pitch to Blinkit (Sajal Gupta / Manik Chawla / `future@blinkit.com`)
> *"Hi Sajal / Manik — loved Blinkit’s Lambda post on Continuous Replenishment being a 0-to-1 problem and managing dump-related cost burns.*  
> *I built **Outpost** to explore that exact challenge: an operations platform modeling intraday van corridors and discrete batch expiry across 5 Mumbai hubs, backed by an auditable LangGraph state machine with an interactive Test Lab for IPL demand rushes and RFC highway delays.*  
> *The system strictly forbids inventory teleportation, modeling physical lead times and exactly-once arrival events.*  
> *Live Demo: https://dark-store-operator.vercel.app | Code: https://github.com/kwakhare5/Outpost*  
> *Would love your perspective on how we structure the pre-execution safety gate."*

#### 3. Pitch to Swiggy Instamart (Samkit Jain / Tapan Ghia)
> *"Hi Samkit — read Priyanka Banik's Swiggy Bytes paper on Adaptive Metric Alignment and the pitfalls of availability bias in censored sales data.*  
> *In **Outpost**, I explicitly decoupled requested demand from fulfilled sales to prevent that exact under-replenishment bias in our Holt linear engine, pairing it with an auditable approval gate before transit van dispatch across 5 Mumbai dark stores.*  
> *Live Demo: https://dark-store-operator.vercel.app | Code: https://github.com/kwakhare5/Outpost*  
> *Curious if this aligns with how your supply chain pods handle demand de-biasing during evening surges."*

#### 4. Pitch to Swish (Saran S / Ujjwal Sukheja)
> *"Hi Saran — love the velocity Swish is achieving with ultra-fast order fulfillment.*  
> *I built **Outpost**, a deterministic inventory replenishment engine for micro-hubs that balances tight stock buffers with expiration horizons. It features discrete FIFO batch tracking, realistic road transit lead times, and an interactive Test Lab that models surge multipliers and supplier bottlenecks.*  
> *Live Demo: https://dark-store-operator.vercel.app | Code: https://github.com/kwakhare5/Outpost*  
> *Would love to share how our state machine enforces mass conservation during inter-hub transfers."*

#### 5. Pitch to BigBasket / Flipkart Minutes (Siva Kumar Tangudu / Nilaksh Bajpai)
> *"Hi Siva / Nilaksh — quick-commerce replenishment in 2,000 sq ft nodes leaves zero room for stock errors or unconstrained automated reorders.*  
> *I engineered **Outpost**, an operations engine that coordinates Regional Fulfilment Centre (RFC) purchase orders and inter-store van balancing with a verified Level-2 human approval gate, double-check idempotency, and discrete FIFO batch tracking.*  
> *Live Demo: https://dark-store-operator.vercel.app | Code: https://github.com/kwakhare5/Outpost*  
> *Would welcome any quick feedback from your supply chain engineering team."*
