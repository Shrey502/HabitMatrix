from fastapi import APIRouter
from datetime import datetime, timedelta, timezone
from database import db

router = APIRouter()

@router.get("/dashboard/metrics")
async def get_metrics():
    todo        = await db.tasks.count_documents({"status": "To-Do"})
    in_progress = await db.tasks.count_documents({"status": "In Progress"})
    done        = await db.tasks.count_documents({"status": "Done"})

    pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}]
    categories = await db.tasks.aggregate(pipeline).to_list(100)
    category_data = [{"name": c["_id"], "value": c["count"]} for c in categories]

    return {
        "kpi": {"todo": todo, "in_progress": in_progress, "done": done},
        "categories": category_data
    }

@router.get("/analytics/grid")
async def get_grid_analytics(year: int):
    start = f"{year}-01-01"
    end = f"{year}-12-31"
    tasks = await db.tasks.find({
        "status": "Done",
        "date": {"$gte": start, "$lte": end}
    }, {"title": 1, "category": 1, "date": 1, "duration": 1}).to_list(5000)
    
    for t in tasks:
        t["_id"] = str(t["_id"])
    return tasks

@router.get("/analytics/streaks")
async def get_streaks():
    logs = await db.daily_logs.find({"total_completed": {"$gt": 0}}).sort("date", 1).to_list(1000)
    if not logs:
        return {"current_streak": 0, "longest_streak": 0, "total_active_days": 0, "best_day_of_week": None}

    active_dates   = sorted(set(log["date"] for log in logs))
    total_active   = len(active_dates)
    date_set       = set(active_dates)
    today          = datetime.now(timezone.utc).date()

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
        prev = datetime.strptime(active_dates[i-1], "%Y-%m-%d").date()
        curr = datetime.strptime(active_dates[i],   "%Y-%m-%d").date()
        run  = run + 1 if (curr - prev).days == 1 else 1
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
async def get_trends():
    today    = datetime.now(timezone.utc).date()
    start    = today - timedelta(days=29)
    logs     = await db.daily_logs.find({"date": {"$gte": str(start), "$lte": str(today)}}).to_list(30)
    log_map  = {log["date"]: log["total_completed"] for log in logs}
    pipeline = [
        {"$match": {"date": {"$gte": str(start), "$lte": str(today)}}},
        {"$group": {"_id": "$date", "total": {"$sum": 1}}}
    ]
    totals_raw = await db.tasks.aggregate(pipeline).to_list(30)
    total_map  = {d["_id"]: d["total"] for d in totals_raw}
    return [{"date": str(start + timedelta(days=i)),
             "completed": log_map.get(str(start + timedelta(days=i)), 0),
             "total":     total_map.get(str(start + timedelta(days=i)), 0)} for i in range(30)]

@router.get("/analytics/category-breakdown")
async def get_category_breakdown():
    pipeline = [{"$group": {"_id": "$category", "total": {"$sum": 1},
                             "done": {"$sum": {"$cond": [{"$eq": ["$status","Done"]}, 1, 0]}}}}]
    raw = await db.tasks.aggregate(pipeline).to_list(10)
    result = [{"category": d["_id"], "total": d["total"], "done": d["done"],
               "rate": round((d["done"]/d["total"])*100, 1) if d["total"] else 0.0} for d in raw]
    result.sort(key=lambda x: x["rate"], reverse=True)
    return result
