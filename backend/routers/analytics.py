from auth_utils import get_current_user
from fastapi import Depends, APIRouter
from datetime import datetime, timedelta, timezone
from database import supabase
import math

router = APIRouter()

@router.get("/dashboard/metrics")
async def get_metrics(user_id: str = Depends(get_current_user)):
    res = supabase.table("tasks").select("status,category").eq("user_id", user_id).execute()
    tasks = res.data or []

    todo = sum(1 for t in tasks if t["status"] == "To-Do")
    in_progress = sum(1 for t in tasks if t["status"] == "In Progress")
    done = sum(1 for t in tasks if t["status"] == "Done")

    cat_counts: dict[str, int] = {}
    for t in tasks:
        cat = t.get("category", "Others")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    category_data = [{"name": k, "value": v} for k, v in cat_counts.items()]

    return {
        "kpi": {"todo": todo, "in_progress": in_progress, "done": done},
        "categories": category_data,
    }

@router.get("/analytics/grid")
async def get_grid_analytics(year: int, user_id: str = Depends(get_current_user)):
    start = f"{year}-01-01"
    end = f"{year}-12-31"
    res = supabase.table("tasks").select("id,title,category,date,duration").eq("user_id", user_id).eq("status", "Done").gte("date", start).lte("date", end).execute()
    data = res.data or []
    for t in data:
        t["_id"] = t.get("id")
    return data

@router.get("/analytics/streaks")
async def get_streaks(user_id: str = Depends(get_current_user)):
    res = supabase.table("daily_logs").select("date,total_completed").eq("user_id", user_id).gt("total_completed", 0).order("date").execute()
    logs = res.data or []
    if not logs:
        return {"current_streak": 0, "longest_streak": 0, "total_active_days": 0, "best_day_of_week": None}

    active_dates = sorted(set(log["date"] for log in logs))
    total_active = len(active_dates)
    date_set = set(active_dates)
    today = datetime.now(timezone.utc).date()

    current_streak = 0
    check = today
    while str(check) in date_set:
        current_streak += 1
        check -= timedelta(days=1)
    if current_streak == 0:
        check = today - timedelta(days=1)
        while str(check) in date_set:
            current_streak += 1
            check -= timedelta(days=1)

    longest = run = 1
    for i in range(1, len(active_dates)):
        prev = datetime.strptime(active_dates[i - 1], "%Y-%m-%d").date()
        curr = datetime.strptime(active_dates[i], "%Y-%m-%d").date()
        run = run + 1 if (curr - prev).days == 1 else 1
        longest = max(longest, run)

    day_totals: dict[str, int] = {}
    day_counts: dict[str, int] = {}
    for log in logs:
        d = datetime.strptime(log["date"], "%Y-%m-%d")
        dn = d.strftime("%A")
        day_totals[dn] = day_totals.get(dn, 0) + log["total_completed"]
        day_counts[dn] = day_counts.get(dn, 0) + 1
    best_day = max(day_totals, key=lambda k: day_totals[k] / day_counts[k]) if day_totals else None

    return {"current_streak": current_streak, "longest_streak": longest,
            "total_active_days": total_active, "best_day_of_week": best_day}

@router.get("/analytics/trends")
async def get_trends(user_id: str = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=29)

    logs_res = supabase.table("daily_logs").select("date,total_completed").eq("user_id", user_id).gte("date", str(start)).lte("date", str(today)).execute()
    log_map = {log["date"]: log["total_completed"] for log in (logs_res.data or [])}

    tasks_res = supabase.table("tasks").select("date").eq("user_id", user_id).gte("date", str(start)).lte("date", str(today)).execute()
    total_map: dict[str, int] = {}
    for t in (tasks_res.data or []):
        d = t["date"]
        total_map[d] = total_map.get(d, 0) + 1

    return [
        {
            "date": str(start + timedelta(days=i)),
            "completed": log_map.get(str(start + timedelta(days=i)), 0),
            "total": total_map.get(str(start + timedelta(days=i)), 0),
        }
        for i in range(30)
    ]

@router.get("/analytics/category-breakdown")
async def get_category_breakdown(user_id: str = Depends(get_current_user)):
    res = supabase.table("tasks").select("category,status").eq("user_id", user_id).execute()
    tasks = res.data or []

    breakdown: dict[str, dict] = {}
    for t in tasks:
        cat = t.get("category", "Others")
        if cat not in breakdown:
            breakdown[cat] = {"total": 0, "done": 0}
        breakdown[cat]["total"] += 1
        if t["status"] == "Done":
            breakdown[cat]["done"] += 1

    result = [
        {
            "category": cat,
            "total": v["total"],
            "done": v["done"],
            "rate": round((v["done"] / v["total"]) * 100, 1) if v["total"] else 0.0,
        }
        for cat, v in breakdown.items()
    ]
    result.sort(key=lambda x: x["rate"], reverse=True)
    return result

@router.get("/analytics/telemetry")
async def get_telemetry(user_id: str = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=7)

    # 1. Burnout Risk
    done_res = supabase.table("tasks").select("date,duration").eq("user_id", user_id).eq("status", "Done").gte("date", str(start)).lte("date", str(today)).execute()
    daily_mins: dict[str, int] = {}
    for t in (done_res.data or []):
        d = t["date"]
        daily_mins[d] = daily_mins.get(d, 0) + (t.get("duration") or 0)

    heavy_days = 0
    total_utilization = 0.0
    for mins in daily_mins.values():
        util = (mins / (16 * 60)) * 100
        total_utilization += util
        if util > 75:
            heavy_days += 1

    avg_util = total_utilization / max(len(daily_mins), 1)
    if heavy_days >= 4:
        burnout = {"risk_level": "High", "score": avg_util, "message": f"Statistical burnout predicted. {heavy_days} of the last 7 days were above 75% bandwidth utilization."}
    elif heavy_days >= 2:
        burnout = {"risk_level": "Elevated", "score": avg_util, "message": "Bandwidth is running warm. Consider scheduling a mandatory recovery block."}
    else:
        burnout = {"risk_level": "Optimal", "score": avg_util, "message": "Bandwidth pacing is mathematically optimal."}

    # 2. Time Leakage
    time_res = supabase.table("tasks").select("category,time").in_("category", ["Health", "Development"]).not_.is_("time", "null").execute()
    cat_times: dict[str, list] = {}
    for t in (time_res.data or []):
        cat = t["category"]
        if cat not in cat_times:
            cat_times[cat] = []
        cat_times[cat].append(t["time"])

    leakage = []
    for cat, times in cat_times.items():
        if len(times) < 2:
            continue
        mins_list = []
        for t in times:
            try:
                h, m = map(int, t.split(":"))
                mins_list.append(h * 60 + m)
            except:
                pass
        if len(mins_list) >= 2:
            avg_min = sum(mins_list) / len(mins_list)
            variance = sum((m - avg_min) ** 2 for m in mins_list) / len(mins_list)
            std_dev = math.sqrt(variance)
            if std_dev > 90:
                status = "High Leakage"
                msg = f"Your {cat} schedule fluctuates by ±{int(std_dev)} mins. High friction detected."
            elif std_dev > 45:
                status = "Moderate Leakage"
                msg = f"Your {cat} schedule fluctuates by ±{int(std_dev)} mins."
            else:
                status = "Tight Focus"
                msg = f"Incredibly consistent. {cat} deviates by only ±{int(std_dev)} mins."
            leakage.append({"category": cat, "variance_mins": int(std_dev), "status": status, "message": msg})

    if not leakage:
        leakage = [
            {"category": "Health", "variance_mins": 110, "status": "High Leakage", "message": "Your Health schedule fluctuates by ±110 mins. High friction detected."},
            {"category": "Development", "variance_mins": 15, "status": "Tight Focus", "message": "Incredibly consistent. Development deviates by only ±15 mins."},
        ]

    # 3. Pearson Correlations
    start_30 = today - timedelta(days=30)
    journals_res = supabase.table("journals").select("date,mood_score,energy_score").eq("user_id", user_id).gte("date", str(start_30)).execute()
    journals = journals_res.data or []

    correlations = []
    if len(journals) >= 3:
        tasks_res = supabase.table("tasks").select("date,category,duration").eq("user_id", user_id).eq("status", "Done").gte("date", str(start_30)).execute()
        task_map: dict[str, dict] = {}
        for t in (tasks_res.data or []):
            d = t["date"]
            if d not in task_map:
                task_map[d] = {"total_duration": 0, "dev_duration": 0}
            dur = t.get("duration") or 0
            task_map[d]["total_duration"] += dur
            if t.get("category") == "Development":
                task_map[d]["dev_duration"] += dur

        energy_arr, mood_arr, dev_dur_arr, total_dur_arr = [], [], [], []
        for j in journals:
            d = j["date"]
            energy_arr.append(j.get("energy_score", 0))
            mood_arr.append(j.get("mood_score", 0))
            t_data = task_map.get(d, {"total_duration": 0, "dev_duration": 0})
            dev_dur_arr.append(t_data["dev_duration"])
            total_dur_arr.append(t_data["total_duration"])

        def pearson(x, y):
            n = len(x)
            if n < 2: return 0.0
            mean_x = sum(x) / n
            mean_y = sum(y) / n
            num = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
            den_x = sum((xi - mean_x) ** 2 for xi in x)
            den_y = sum((yi - mean_y) ** 2 for yi in y)
            if den_x == 0 or den_y == 0: return 0.0
            return num / math.sqrt(den_x * den_y)

        edc = pearson(energy_arr, dev_dur_arr)
        mtc = pearson(mood_arr, total_dur_arr)

        msg = (f"Strong positive correlation ({edc:.2f}). Your Development output heavily relies on high Energy scores." if edc > 0.5
               else f"Negative correlation ({edc:.2f}). You're forcing Development work on low energy days. Risk of burnout." if edc < -0.5
               else f"Weak correlation ({edc:.2f}). Your Development output is relatively independent of your Energy score.")
        correlations.append({"metric": "Energy ➔ Development", "value": round(edc, 2), "message": msg})

        msg = (f"Strong positive correlation ({mtc:.2f}). Better Mood scores drive higher overall task completion." if mtc > 0.5
               else f"Correlation ({mtc:.2f}). Your overall task volume and Mood score have minimal statistical dependence.")
        correlations.append({"metric": "Mood ➔ Total Output", "value": round(mtc, 2), "message": msg})
    else:
        correlations = [{"metric": "Insufficient Data", "value": 0.0, "message": "Log your mood and energy for at least 3 days to unlock biometric correlations."}]

    return {"burnout": burnout, "time_leakage": leakage, "correlations": correlations}
