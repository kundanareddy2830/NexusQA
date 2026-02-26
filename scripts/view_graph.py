import os
import json
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

def fetch_graph_data():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    with driver.session() as session:
        # Fetch all States
        states_result = session.run("""
            MATCH (s:Page)
            RETURN s.id AS id, s.url AS url, s.intent AS intent, s.type AS classification
        """)
        states = [dict(record) for record in states_result]
        
        # Fetch all Issues (Vulnerabilities)
        issues_result = session.run("""
            MATCH (s:Page)-[:HAS_ISSUE]->(i:Issue)
            RETURN s.url AS url, i.type AS type, i.severity AS severity, i.description AS description, i.ai_business_impact AS ai_insight
        """)
        issues = {}
        for record in issues_result:
            url = record['url']
            if url not in issues:
                issues[url] = []
            issues[url].append({
                "type": record['type'],
                "severity": record['severity'],
                "description": record['description'],
                "ai_insight": record['ai_insight']
            })
            
        # Fetch edges (Navigation Paths)
        edges_result = session.run("""
            MATCH (source:Page)-[r:LINKS_TO|TRIGGERS]->(target)
            RETURN source.url AS source_url, type(r) AS type, coalesce(target.url, target.type) AS target_url
        """)
        edges = [dict(record) for record in edges_result]
        
    driver.close()
    
    with open("graph_dump.txt", "w", encoding="utf-8") as f:
        f.write("=======================================================\n")
        f.write(" 🕸️  NEXUSQA NEO4J KNOWLEDGE GRAPH DUMP\n")
        f.write("=======================================================\n")
        f.write(f"\nTotal States Mapped: {len(states)}\n")
        
        for state in states:
            url = state['url']
            f.write(f"\n🌐 State: {url}\n")
            f.write(f"   Intent: {state['intent']}\n")
            f.write(f"   Classification: {state['classification']}\n")
            
            if url in issues:
                f.write("   🚨 Vulnerabilities Found:\n")
                for issue in issues[url]:
                    f.write(f"      - [{issue['severity']}] {issue['type']}: {issue['description']}\n")
                    if issue.get('ai_insight'):
                        f.write(f"        {issue['ai_insight']}\n")
            else:
                f.write("   ✅ No vulnerabilities detected on this node.\n")
                
        f.write("\n=======================================================\n")
        f.write(" 🛣️  MAPPED NAVIGATION EDGES\n")
        f.write("=======================================================\n")
        for edge in edges:
            f.write(f"{edge['source_url']} --[{edge['type']}]--> {edge['target_url']}\n")

if __name__ == "__main__":
    fetch_graph_data()
