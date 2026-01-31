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
    
    # In a real app, this would call an external API (Platsbanken/LinkedIn)
    # For now, we suggest 3 high-quality strategic roles + 3 based on your history
    strategic_targets = [
        {
            "id": "s1",
            "title": "Public Bid Manager",
            "company": "Advania",
            "location": "Stockholm (Hybrid)",
            "commute": "3h 15m",
            "type": "official",
            "link": "https://www.advania.se/karriar"
        },
        {
            "id": "s2",
            "title": "Anbudsansvarig",
            "company": "Atea",
            "location": "Växjö/Remote",
            "commute": "1h 30m",
            "type": "official",
            "link": "https://www.atea.se/om-atea/jobba-hos-oss/"
        },
        {
            "id": "s3",
            "title": "Strategic Bid Specialist",
            "company": "CGI",
            "location": "Jönköping",
            "commute": "45m",
            "type": "official",
            "link": "https://www.cgi.com/se/sv/karriar"
        }
    ]
    
    # Add 3 spontaneous targets from your history (companies you've looked at before)
    if history:
        unique_companies = list(set([h["company"] for h in history]))[:3]
        for idx, company in enumerate(unique_companies):
            strategic_targets.append({
                "id": f"h{idx}",
                "title": "Spontanansökan (Bid Ops)",
                "company": company,
                "location": "Se historik",
                "commute": "-",
                "type": "spontaneous",
                "link": ""
            })

    # Enrich with history flags
    results = []
    for job in strategic_targets:
        matches = [h for h in history if h["company"].lower() == job["company"].lower()]
        history_info = None
        if matches:
            latest = sorted(matches, key=lambda x: x["applied_date"], reverse=True)[0]
            history_info = {
                "last_applied": latest["applied_date"],
                "last_status": latest["status"]
            }
        
        results.append({**job, "history": history_info})
        
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
