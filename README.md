# NexusQA 🤖 Quality Intelligence Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Autonomous Multimodal QA Intelligence Engine**

NexusQA is an autonomous, multi-agent AI Quality Intelligence Platform that shifts enterprise Software Testing (QA) away from "Blind Execution" (running hardcoded scripts) to "Intelligent Exploration" (AI agents that autonomously reverse-engineer, test, and self-heal applications).

Give it a URL, and our Tri-Agent AI autonomously maps the application into a Neo4j knowledge graph, intercepts network telemetry to find vulnerabilities, and writes the Playwright debugging script for the developer automatically.

---

## 🚨 The Problem: Why NexusQA is Needed

Modern enterprise software is failing at the testing layer. QA teams are crippled by three major industry flaws:

1. **The Maintenance Nightmare (Brittle Scripts):** Traditional tools like Selenium and Cypress require humans to write exact scripts. When a developer changes a single button ID, the entire test suite breaks.
2. **Execution vs. Reasoning:** Current tools only do exactly what they are told (Pass/Fail). They cannot explore unknown features, correlate frontend UI glitches with backend API network errors, or reason about business impact.
3. **Tool Fragmentation:** Enterprises use one tool for UI testing, another for API testing, and another for Security. There is no unified "intelligence layer".

---

## ⚙️ How It Works: The Tri-Agent Architecture

To solve these problems, NexusQA abandons traditional scripting entirely. It is built as a **Tri-Agent DevSecOps Architecture** that communicates through a Neo4j Graph Database.

### 🗺️ Step 1: Map the Unknown (Agent 1 - The Cartographer)
* Navigates the target web application like a real human.
* Uses **Heuristic Fuzzing** to type into search bars and trigger hidden Javascript dropdowns.
* Uses **Structural Fingerprinting** to recognize page layouts, building a massive "Semantic Digital Twin" (a mapped FSM graph) of the application inside Neo4j.

### 🕵️‍♂️ Step 2: Contextual Vulnerability Scanning (Agent 2 - The Inspector)
* Once the map is built, it inspects every single state.
* Operating as a **Light Gray-Box Engine**, it intercepts hidden network API payloads, catches Javascript console errors, and scans the DOM for Accessibility and Security flaws.
* Uses AI to dynamically escalate severity based on context (e.g., a missing ARIA label on a blog is "Low", but on a Checkout page, it escalates to "High").

### 👔 Step 3: Executive Reporting & Auto-Healing (Agent 3 - The Strategist)
* Aggregates the defect data into an **Executive Hygiene Score (0-100)** for C-Level visibility.
* **The Healer:** Autonomously reads the database graph and writes a deterministic, ready-to-run Python Playwright script that reproduces the exact vulnerability, saving developers hours of manual debugging.

---

## 💎 Business Value

NexusQA introduces **Zero-Friction Onboarding**. We don't need access to backend source code or private AWS servers. We provide maximum value from the outside-in.

* **Eliminate Script Maintenance:** The AI maps the application dynamically on every run; it doesn't rely on brittle XPaths.
* **Accelerate CI/CD:** Finding bugs, classifying their severity, and writing the reproduction script happens in minutes, autonomously.
* **Bridge the Dev/QA Gap:** Developers no longer get vague "test failed" messages. They receive a precise hygiene score, a network-level root cause, and the exact code script to reproduce the failure.

---

## 🏗️ Directory Structure

- `src/agents/`: The orchestration layer (Agent 1: Cartographer, Agent 2: Inspector, Agent 3: Strategist).
- `src/core/`: The foundational extraction, fingerprinting, and interaction logic.
- `src/scanners/`: The DevSecOps rulesets (DOM Hygiene, Business Logic).
- `src/database/`: The Neo4j Graph persistence layer.
- `scripts/`: Operational utility scripts.

---

## 🚀 Getting Started

1. **Start the Neo4j Database:**
   ```bash
   docker-compose up -d
   ```

2. **Run the Autonomous Pipeline:**
   Use the central entry point to run the QA engine:
   ```bash
   python -m src.main
   ```
