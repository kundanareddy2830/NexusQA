import argparse
import asyncio
import sys

from src.agents.agent1_cartographer import run_agent as run_agent1
from src.agents.agent2_inspector import run_inspector as run_agent2
from src.agents.agent3_strategist import analyze_risk, print_executive_summary

def main():
    parser = argparse.ArgumentParser(description="NexusQA Autonomous Testing Engine")
    parser.add_argument("agent", choices=["1", "2", "3", "all"], help="Specify the agent phase to execute (1=Cartographer, 2=Inspector, 3=Strategist/Healer, all=Pipeline).")
    
    if len(sys.argv) == 1:
        parser.print_help(sys.stderr)
        sys.exit(1)
        
    args = parser.parse_args()

    if args.agent in ["1", "all"]:
        target = "http://localhost:4000/"
        print("=======================================================")
        print(" 🚀 ORCHESTRATOR: Launching Agent 1 (The Cartographer)")
        print("=======================================================")
        asyncio.run(run_agent1(target))
    
    if args.agent in ["2", "all"]:
        print("\n=======================================================")
        print(" 🚀 ORCHESTRATOR: Launching Agent 2 (The Inspector)")
        print("=======================================================")
        run_agent2()
        
    if args.agent in ["3", "all"]:
        print("\n=======================================================")
        print(" 🚀 ORCHESTRATOR: Launching Agent 3 (The Strategist)")
        print("=======================================================")
        report = analyze_risk()
        if report:
            print_executive_summary(report)

if __name__ == "__main__":
    main()
