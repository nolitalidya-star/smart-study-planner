
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, timedelta

app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = (
    "sqlite:///smart_study_planner.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


# =========================
# DATABASE
# =========================

class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    color = db.Column(db.String(20), default="#8b78d6")


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    due_date = db.Column(db.Date)
    priority = db.Column(db.String(20), default="Sedang")
    status = db.Column(db.String(20), default="Belum")

    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subject.id")
    )

    subject = db.relationship("Subject")


class Schedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    study_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.String(10))
    end_time = db.Column(db.String(10))
    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subject.id")
    )

    subject = db.relationship("Subject")


class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    content = db.Column(db.Text)
    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subject.id")
    )

    subject = db.relationship("Subject")


# =========================
# HELPER
# =========================

def task_data(task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description or "",
        "due_date": task.due_date.isoformat()
        if task.due_date else "",
        "priority": task.priority,
        "status": task.status,
        "subject_id": task.subject_id,
        "subject": task.subject.name
        if task.subject else "Umum"
    }


# =========================
# MAIN PAGE
# =========================

@app.route("/")
def home():
    return render_template("index.html")


# =========================
# DASHBOARD
# =========================

@app.route("/api/dashboard")
def dashboard():

    tasks = Task.query.all()

    total = len(tasks)

    completed = sum(
        task.status == "Selesai"
        for task in tasks
    )

    pending = sum(
        task.status != "Selesai"
        for task in tasks
    )

    today = date.today()

    overdue = sum(
        task.status != "Selesai"
        and task.due_date
        and task.due_date < today
        for task in tasks
    )

    progress = (
        round(completed / total * 100)
        if total else 0
    )

    return jsonify({
        "total": total,
        "completed": completed,
        "pending": pending,
        "overdue": overdue,
        "progress": progress
    })


# =========================
# TASK MANAGEMENT
# =========================

@app.route("/api/tasks", methods=["GET", "POST"])
def tasks():

    if request.method == "POST":

        data = request.get_json()

        if not data or not data.get("title", "").strip():
            return jsonify({"error": "Judul wajib diisi"}), 400

        task = Task(
            title=data["title"].strip(),
            description=data.get("description", ""),
            due_date=date.fromisoformat(data["due_date"])
            if data.get("due_date") else None,
            priority=data.get("priority", "Sedang"),
            status=data.get("status", "Belum"),
            subject_id=data.get("subject_id") or None
        )

        db.session.add(task)
        db.session.commit()

        return jsonify(task_data(task)), 201

    return jsonify([
        task_data(task)
        for task in Task.query.order_by(
            Task.id.desc()
        ).all()
    ])


@app.route("/api/tasks/<int:id>", methods=["PUT", "DELETE"])
def task_detail(id):

    task = db.get_or_404(Task, id)

    if request.method == "DELETE":

        db.session.delete(task)
        db.session.commit()

        return jsonify({"message": "Tugas dihapus"})

    data = request.get_json()

    task.title = data.get("title", task.title)
    task.description = data.get(
        "description", task.description
    )
    task.priority = data.get(
        "priority", task.priority
    )
    task.status = data.get(
        "status", task.status
    )

    if "due_date" in data:
        task.due_date = (
            date.fromisoformat(data["due_date"])
            if data["due_date"] else None
        )

    if "subject_id" in data:
        task.subject_id = data["subject_id"] or None

    db.session.commit()

    return jsonify(task_data(task))


# =========================
# SUBJECTS
# =========================

@app.route("/api/subjects", methods=["GET", "POST"])
def subjects():

    if request.method == "POST":

        data = request.get_json()
        name = data.get("name", "").strip()

        if not name:
            return jsonify({"error": "Nama wajib diisi"}), 400

        if Subject.query.filter_by(name=name).first():
            return jsonify({"error": "Mapel sudah ada"}), 400

        subject = Subject(
            name=name,
            color=data.get("color", "#8b78d6")
        )

        db.session.add(subject)
        db.session.commit()

        return jsonify({
            "id": subject.id,
            "name": subject.name,
            "color": subject.color
        }), 201

    return jsonify([
        {
            "id": s.id,
            "name": s.name,
            "color": s.color
        }
        for s in Subject.query.all()
    ])


# =========================
# SCHEDULE
# =========================

@app.route("/api/schedules", methods=["GET", "POST"])
def schedules():

    if request.method == "POST":

        data = request.get_json()

        schedule = Schedule(
            title=data["title"],
            study_date=date.fromisoformat(
                data["study_date"]
            ),
            start_time=data["start_time"],
            end_time=data["end_time"],
            subject_id=data.get("subject_id") or None
        )

        db.session.add(schedule)
        db.session.commit()

        return jsonify({"message": "Jadwal tersimpan"}), 201

    return jsonify([
        {
            "id": s.id,
            "title": s.title,
            "study_date": s.study_date.isoformat(),
            "start_time": s.start_time,
            "end_time": s.end_time,
            "subject": s.subject.name if s.subject else "Umum"
        }
        for s in Schedule.query.order_by(
            Schedule.study_date
        ).all()
    ])


# =========================
# NOTES
# =========================

@app.route("/api/notes", methods=["GET", "POST"])
def notes():

    if request.method == "POST":

        data = request.get_json()

        note = Note(
            title=data["title"],
            content=data.get("content", ""),
            subject_id=data.get("subject_id") or None
        )

        db.session.add(note)
        db.session.commit()

        return jsonify({"message": "Catatan tersimpan"}), 201

    return jsonify([
        {
            "id": n.id,
            "title": n.title,
            "content": n.content,
            "subject": n.subject.name if n.subject else "Umum"
        }
        for n in Note.query.order_by(Note.id.desc()).all()
    ])


# =========================
# DELETE SCHEDULE / NOTES
# =========================

@app.route("/api/schedules/<int:id>", methods=["DELETE"])
def delete_schedule(id):
    item = db.get_or_404(Schedule, id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Jadwal dihapus"})


@app.route("/api/notes/<int:id>", methods=["DELETE"])
def delete_note(id):
    item = db.get_or_404(Note, id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Catatan dihapus"})


# =========================
# INITIAL DATABASE
# =========================

with app.app_context():

    db.create_all()

    if Subject.query.count() == 0:

        default_subjects = [
            "Matematika",
            "Bahasa Indonesia",
            "Bahasa Inggris",
            "Informatika",
            "Biologi",
            "Fisika",
            "Kimia"
        ]

        for name in default_subjects:
            db.session.add(Subject(name=name))

        db.session.commit()


# =========================
# RUN APPLICATION
# =========================

if __name__ == "__main__":
    app.run(debug=True)
