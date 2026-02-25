# NexusQA

## Overview
NexusQA is an Autonomous DevSecOps QA Engine that uses AI to map, inspect, and heal web applications.

## Directory Structure
- `src/agents/`: The orchestration layer (Agent 1: Cartographer, Agent 2: Inspector, Agent 3: Strategist).
- `src/core/`: The foundational extraction, fingerprinting, and interaction logic.
- `src/scanners/`: The DevSecOps rulesets (DOM Hygiene, Business Logic).
- `src/database/`: The Neo4j Graph persistence layer.
- `scripts/`: Operational utility scripts.

## Usage
Use the central entry point to run the pipeline:
```bash
python -m src.main
```
