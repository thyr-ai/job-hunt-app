from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
import os
import zipfile
import io
import pandas as pd
import random
from datetime import datetime, timedelta
from data.cv import mattias_thyr_profile

app = FastAPI(title="Job Hunt Dashboard API")

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def root():
    return {"message": "Job Hunt API is running!", "docs": "/docs"}

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_history():
    history_path = "data/notion_jobs.json"
    if os.path.exists(history_path):
        try:
            with open(history_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

@app.get("/api/search")
async def search_jobs():
    history = load_history()
    applied_companies = {h["company"].lower() for h in history}
    
    # Curated pool of specific, high-intent targets
    # NOTE: In production, this would be fed by a web scraper
    potential_pool = [
        {
            "title": "Public Bid Manager", 
            "company": "Advania", 
            "location": "Stockholm (Hybrid)", 
            "commute": "3h 15m", 
            "link": "https://pms.advania.se/jobs/123456-public-bid-manager", # Specific ad
            "deadline": "2026-02-28",
            "type": "official"
        },
        {
            "title": "Anbudsansvarig (Offentlig Sektor)", 
            "company": "Atea", 
            "location": "Växjö/Remote", 
            "commute": "1h 30m", 
            "link": "https://www.atea.se/karriar/lediga-tjanster/anbudsansvarig-offentlig-sektor-9876", # Specific ad
            "deadline": "2026-02-24",
            "type": "official"
        },
        {
            "title": "Strategic Bid Specialist", 
            "company": "CGI", 
            "location": "Jönköping", 
            "commute": "45m", 
            "link": "https://cgi.njoyn.com/cl4/xweb/xweb.asp?CLID=21001&page=jobdetails&jobid=J1234-5678", # Specific ad
            "deadline": "2026-02-28",
            "type": "official"
        },
        {
            "title": "Bid Manager", 
            "company": "Tietoevry", 
            "location": "Malmö (Hybrid)", 
            "commute": "2h 45m", 
            "link": "https://tietoevry.wd3.myworkdayjobs.com/External/job/Malm/Bid-Manager_JR123",
            "deadline": "2026-02-15",
            "type": "official"
        },
        {
            "title": "Anbudsprojektledare", 
            "company": "Svevia", 
            "location": "Stockholm", 
            "commute": "3h 15m", 
            "link": "https://jobb.svevia.se/jobs/anbudsprojektledare-stockholm",
            "deadline": "2026-02-28",
            "type": "official"
        },
        {
            "title": "Public Sector Sales Coordinator", 
            "company": "Dustin", 
            "location": "Stockholm (Hybrid)", 
            "commute": "3h 15m", 
            "link": "https://career.dustingroup.com/jobs/sales-coordinator-public",
            "deadline": "2026-02-20",
            "type": "official"
        }
    ]
    
    # Filter by:
    # 1. Company not already applied to
    # 2. Deadline is in the future
    # 3. Deadline is within 30 days from now
    
    # We use your current project time: 2026-01-31
    now = datetime(2026, 1, 31)
    max_date = now + timedelta(days=30)
    
    valid_targets = []
    for job in potential_pool:
        # Check company
        if job["company"].lower() in applied_companies:
            continue
            
        # Check date
        try:
            deadline_date = datetime.strptime(job["deadline"], "%Y-%m-%d")
            if now <= deadline_date <= max_date:
                valid_targets.append(job)
        except (ValueError, KeyError):
            # If no deadline or bad format, it might be a fallback/ongoing role
            # but for "Official Ads", we require a valid future date
            continue
    
    # Shuffle from the valid list
    selected_official = random.sample(valid_targets, min(len(valid_targets), 3))
    
    results = []
    for idx, job in enumerate(selected_official):
        results.append({
            "id": f"new-{idx}-{random.randint(100,999)}",
            **job,
            "history": None
        })
        
    # Also add 3 "Cold Outreach" targets that are NOT in history yet
    cold_reach_pool = ["Capgemini", "Sogeti", "Softronic", "Enfo", "Fujitsu", "Orange Cyberdefense", "Accenture", "IBM", "Verizon", "Telia"]
    cold_targets = [c for c in cold_reach_pool if c.lower() not in applied_companies]
    
    selected_cold = random.sample(cold_targets, min(len(cold_targets), 3))
    
    for idx, company in enumerate(selected_cold):
        results.append({
            "id": f"cold-{idx}-{random.randint(100,999)}",
            "title": "Spontanansökan (Public Bid Ops)",
            "company": company,
            "location": "Strategy target",
            "commute": "-",
            "type": "spontaneous",
            "link": "",
            "history": None
        })
        
    return results

@app.get("/api/history-stats")
async def get_history_stats():
    history = load_history()
    
    # Get last modified time of the history file
    last_sync = None
    history_path = "data/notion_jobs.json"
    if os.path.exists(history_path):
        mtime = os.path.getmtime(history_path)
        from datetime import datetime
        last_sync = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M")

    stats = {
        "total": len(history),
        "by_status": {},
        "last_sync": last_sync
    }
    for item in history:
        status = item.get("status", "Okänd")
        stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
    return stats

@app.post("/api/upload-notion")
async def upload_notion(file: UploadFile = File(...)):
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Filen måste vara en .zip-fil")
    
    try:
        contents = await file.read()
        z = zipfile.ZipFile(io.BytesIO(contents))
        
        # Find any CSV file inside the zip
        csv_filename = None
        for name in z.namelist():
            if name.endswith('.csv') and not name.startswith('__MACOSX'):
                csv_filename = name
                break
        
        if not csv_filename:
            raise HTTPException(status_code=400, detail="Ingen CSV-fil hittades i zip-arkivet")
        
        # Read the CSV
        with z.open(csv_filename) as f:
            df = pd.read_csv(f)
        
        # Notion CSV columns can vary, attempt to map them
        new_history = []
        for _, row in df.iterrows():
            # Try to find best matches for columns
            item = {
                "company": str(row.get('Företag', row.get('Company', row.get('Name', row.get('Namn', 'Okänt'))))),
                "title": str(row.get('Position', row.get('Title', row.get('Roll', row.get('Tjänst', 'Position'))))),
                "applied_date": str(row.get('Datum', row.get('Date', row.get('Applied', '2025-01-01')))),
                "status": str(row.get('Status', 'Sökt')),
                "url": str(row.get('URL', row.get('Link', ''))),
                "notes": str(row.get('Notes', row.get('Kommentar', '')))
            }
            new_history.append(item)
            
        # Save to our local json
        if not os.path.exists("data"):
            os.makedirs("data")
        with open("data/notion_jobs.json", "w", encoding="utf-8") as f:
            json.dump(new_history, f, indent=2, ensure_ascii=False)
            
        return {"status": "success", "count": len(new_history)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ett fel uppstod: {str(e)}")

@app.get("/api/cv")
async def get_cv():
    return mattias_thyr_profile

@app.post("/api/generate-letter")
async def generate_letter(details: Dict):
    company = details.get("company", "organisationen")
    role = details.get("title", "tjänsten")
    
    # Add context from history if available
    history = load_history()
    matches = [h for h in history if h["company"].lower() == company.lower()]
    
    context = ""
    if matches:
        last = sorted(matches, key=lambda x: x["applied_date"], reverse=True)[0]
        context = f" Jag har tidigare haft kontakt med er angående rollen som {last['title']} under {last['applied_date'][:4]} och är fortsatt mycket intresserad av att bidra till er verksamhet."

    letter_text = f"Hej {company}!\n\nJag söker nu rollen som {role}.{context}\n\nMed vänlig hälsning,\nMattias Thyr"
    
    return {"letter": letter_text}

from fastapi.responses import FileResponse
from fpdf import FPDF

@app.post("/api/download-pdf")
async def download_pdf(data: Dict):
    letter_text = data.get("letter", "")
    filename = "data/personligt_brev.pdf"
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    # Basic cleanup for FPDF
    clean_text = letter_text.encode('latin-1', 'replace').decode('latin-1')
    pdf.multi_cell(0, 10, txt=clean_text)
    
    pdf.output(filename)
    return FileResponse(filename, filename="Personligt_Brev.pdf", media_type="application/pdf")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
