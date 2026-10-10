import json, os, random, string, threading
from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__, static_folder="static", static_url_path="")
sio = SocketIO(app, async_mode="threading", cors_allowed_origins="*")
DB = os.environ.get("DB_PATH", "stats.json")
lock = threading.Lock()
PTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
rooms, who = {}, {}  # code -> room ; sid -> code


def load():
    try:
        with open(DB) as f:
            return json.load(f)
    except Exception:
        return {}


def record(pid, name, pos, pts, best, track):
    with lock:
        d = load()
        s = d.setdefault(pid, dict(name=name, points=0, races=0, wins=0, podiums=0, best={}))
        s["name"] = name
        s["points"] += pts
        s["races"] += 1
        s["wins"] += pos == 1
        s["podiums"] += pos <= 3
        if best and (str(track) not in s["best"] or best < s["best"][str(track)]):
            s["best"][str(track)] = best
        with open(DB, "w") as f:
            json.dump(d, f)


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/leaderboard")
def lb():
    d = load()
    top = sorted(d.values(), key=lambda s: -s["points"])[:20]
    return jsonify([dict(name=s["name"], points=s["points"], wins=s["wins"], races=s["races"]) for s in top])


@app.route("/api/result", methods=["POST"])
def result():
    j = request.get_json(force=True)
    record(j["pid"], j["name"][:16], j["pos"], j["pts"], j.get("best", 0), j.get("track", 0))
    return "ok"


def pub(r):
    return dict(code=r["code"], host=r["host"], track=r["track"], laps=r["laps"], started=r["started"],
                players=[dict(id=k, **{x: v[x] for x in ("name", "team")}) for k, v in r["players"].items()])


def push():
    sio.emit("rooms", [dict(code=r["code"], track=r["track"], laps=r["laps"], n=len(r["players"]),
                            host=list(r["players"].values())[0]["name"])
                       for r in rooms.values() if not r["started"] and len(r["players"]) < 12])


def enter(code, d):
    r = rooms.get(code)
    if not r or r["started"] or len(r["players"]) >= 12:
        return emit("err", "Sala indisponível")
    r["players"][request.sid] = dict(name=str(d.get("name", "Piloto"))[:16], team=int(d.get("team", 0)) % 6, pid=d.get("pid", ""))
    who[request.sid] = code
    join_room(code)
    emit("room", pub(r), to=code)
    push()


@sio.on("list")
def _list():
    push()


@sio.on("create")
def create(d):
    code = "".join(random.choices(string.ascii_uppercase, k=4))
    rooms[code] = dict(code=code, host=request.sid, track=int(d.get("track", 0)) % 3,
                       laps=max(1, min(10, int(d.get("laps", 3)))), started=False, players={}, res=[])
    enter(code, d)


@sio.on("join")
def join(d):
    enter(str(d.get("code", "")).upper(), d)


def leave():
    code = who.pop(request.sid, None)
    r = rooms.get(code)
    if not r:
        return
    r["players"].pop(request.sid, None)
    leave_room(code)
    if not r["players"]:
        rooms.pop(code, None)
    else:
        if r["host"] == request.sid:
            r["host"] = next(iter(r["players"]))
        emit("room", pub(r), to=code)
    push()


sio.on_event("leave", leave)
sio.on_event("disconnect", leave)


@sio.on("start")
def start():
    r = rooms.get(who.get(request.sid))
    if r and r["host"] == request.sid and not r["started"]:
        r["started"], r["res"] = True, []
        emit("start", pub(r), to=r["code"])
        push()


@sio.on("st")
def st(d):
    code = who.get(request.sid)
    if code:
        emit("st", dict(d, id=request.sid), to=code, include_self=False)


@sio.on("fin")
def fin(d):
    r = rooms.get(who.get(request.sid))
    if not r or any(x["id"] == request.sid for x in r["res"]):
        return
    p = r["players"][request.sid]
    pos = len(r["res"]) + 1
    pts = PTS[pos - 1] if pos <= len(PTS) else 0
    r["res"].append(dict(id=request.sid, name=p["name"], team=p["team"], pos=pos, time=d.get("time", 0),
                         best=d.get("best", 0), pts=pts))
    record(p["pid"] or request.sid, p["name"], pos, pts, d.get("best", 0), r["track"])
    emit("res", r["res"], to=r["code"])
    if len(r["res"]) >= len(r["players"]):
        r["started"] = False


if __name__ == "__main__":
    sio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), allow_unsafe_werkzeug=True)
