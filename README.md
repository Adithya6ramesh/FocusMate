
# 🍅 FocusMate - Pomodoro Productivity Tracker

A Chrome Extension + FastAPI backend project that helps students and professionals stay productive using Pomodoro sessions. It tracks browsing activity during focus time, classifies websites as productive or unproductive, and provides daily productivity insights with motivational quotes.  
This was built  FastAPI + browser extension integration.

---

## 👨‍💻 Team member
1. Adithya Ramesh

---

##  Link to product walkthrough
[Demo Video]https://www.loom.com/share/e1831cf4e7a54558a947e9e12fc9672a?sid=234e1b97-70ff-4589-af72-096667623940

---

##  How it Works ?
1. Start the **Pomodoro timer** (25/5, 45/10, 60/15) from the Chrome extension.  
2. During the timer, the extension logs your active tab URLs and sends them to the FastAPI backend.  
3. The backend classifies sites as **productive / unproductive** and stores the stats.  
4. At the end of the day (Finish button), the app shows:  
   - Total productive hours  
   - Productivity percentage  
   - Comparison with yesterday  
   - Motivational quote  



##  Libraries used
- **FastAPI** – Web framework for the backend  
- **Uvicorn** – ASGI server  
- **Requests** – API communication  
- **Chrome Extension APIs (MV3)** – Tabs, storage, background services  


##  How to configure
1. Clone the repo.  
2. Install backend dependencies:  
   ```bash
   cd backend
   pip install -r requirements.txt
````

3. Run backend:

   ```bash
   uvicorn main:app --reload --port 8000
   ```
4. Load `extension/` folder in Chrome → `chrome://extensions/` → Load unpacked.


##  How to Run

1. Start backend server (`http://127.0.0.1:8000`).
2. Open Chrome, start a Pomodoro session via extension.
3. Browse normally → Extension logs activity.
4. At the end of the session, click **Finish** to view analysis and stats.

 me to also make a **super-short "elevator pitch" style** README (just problem + solution + demo link, 10 lines max) so you can quickly show judges in the hackathon?
```
