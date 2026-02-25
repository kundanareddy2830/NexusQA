import os
import json
from neo4j import GraphDatabase

uri = "bolt://localhost:7687"
user = "neo4j"
password = "password"

driver = GraphDatabase.driver(uri, auth=(user, password))

print("\n--- GRAPH SCHEMA VERIFICATION ---\n")

def check_nodes():
    with driver.session() as session:
        # Check ScanSession
        res = session.run("MATCH (n:ScanSession) RETURN count(n) as count")
        print(f"ScanSession Nodes: {res.single()['count']}")
        
        # Check Page
        res = session.run("MATCH (n:Page) RETURN count(n) as count")
        pages = res.single()['count']
        print(f"Page Nodes: {pages}")
        
        # Check Action
        res = session.run("MATCH (n:Action) RETURN count(n) as count")
        print(f"Action Nodes: {res.single()['count']}")
        
        # Check API Call
        res = session.run("MATCH (n:`API Call`) RETURN count(n) as count")
        print(f"API Call Nodes: {res.single()['count']}")
        
        print("\n--- RELATIONSHIP VERIFICATION ---\n")
        
        res = session.run("MATCH ()-[r:PART_OF_SESSION]->() RETURN count(r) as count")
        print(f"PART_OF_SESSION Edges: {res.single()['count']}")
        
        res = session.run("MATCH ()-[r:LINKS_TO]->() RETURN count(r) as count")
        print(f"LINKS_TO Edges: {res.single()['count']}")
        
        res = session.run("MATCH ()-[r:TRIGGERS]->() RETURN count(r) as count")
        print(f"TRIGGERS Edges: {res.single()['count']}")
        
        res = session.run("MATCH ()-[r:CALLS_API]->() RETURN count(r) as count")
        print(f"CALLS_API Edges: {res.single()['count']}")

        print("\n--- NETWORK AWARENESS VERIFICATION ---\n")
        
        res = session.run("MATCH (n:`API Call`) RETURN n LIMIT 1")
        record = res.single()
        if record:
            node = dict(record['n'])
            print(f"Sample API Node Properties:")
            print(json.dumps(node, indent=2))
        else:
            print("No API Call nodes found to inspect.")

try:
    check_nodes()
except Exception as e:
    print(f"Error checking graph: {e}")
finally:
    driver.close()
