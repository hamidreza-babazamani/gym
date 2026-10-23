/**
 * تست ثبت اجرای تمرین.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Exercise Log", () => {
  let coachToken: string;
  let studentToken: string;
  let programExerciseId: string;

  beforeAll(async () => {
    const coachEmail = `coach-log-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "مربی لاگ", email: coachEmail, password: "Password123" });
    await prisma.user.update({ where: { email: coachEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const coachUser = await prisma.user.findUnique({ where: { email: coachEmail } });
    await prisma.userRole.create({ data: { userId: coachUser!.id, role: "COACH" } });
    const coachLogin = await request(app).post("/api/v1/auth/login").send({ email: coachEmail, password: "Password123" });
    coachToken = coachLogin.body.data.accessToken;

    const studentEmail = `student-log-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "شاگرد لاگ", email: studentEmail, password: "Password123" });
    await prisma.user.update({ where: { email: studentEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const studentUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    const studentId = studentUser!.id;
    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password: "Password123" });
    studentToken = studentLogin.body.data.accessToken;

    const sport = await prisma.sport.create({ data: { name: `رشته لاگ ${Date.now()}` } });
    await prisma.coachStudent.create({
      data: { coachId: coachUser!.id, studentId, sportId: sport.id, status: "ACTIVE", initiatedBy: "STUDENT" },
    });

    const exerciseRes = await request(app).post("/api/v1/programs/exercises").set("Authorization", `Bearer ${coachToken}`).send({ name: `پرس لاگ ${Date.now()}` });
    const exerciseId = exerciseRes.body.data.exercise.id;

    const programRes = await request(app).post("/api/v1/programs").set("Authorization", `Bearer ${coachToken}`).send({ name: `برنامه لاگ ${Date.now()}` });
    const programId = programRes.body.data.program.id;

    const dayRes = await request(app).post(`/api/v1/programs/${programId}/days`).set("Authorization", `Bearer ${coachToken}`).send({ dayOfWeek: 1, name: "روز تست" });
    const dayId = dayRes.body.data.day.id;

    const peRes = await request(app).post(`/api/v1/programs/days/${dayId}/exercises`).set("Authorization", `Bearer ${coachToken}`).send({ exerciseId, sets: 4, reps: 12 });
    programExerciseId = peRes.body.data.programExercise.id;

    await request(app).post(`/api/v1/programs/${programId}/assign`).set("Authorization", `Bearer ${coachToken}`).send({ studentId });
  });

  it("باید به ورزشکار اجازه ثبت اجرای تمرین را بدهد", async () => {
    const res = await request(app).post("/api/v1/programs/log").set("Authorization", `Bearer ${studentToken}`).send({
      programExerciseId, actualSets: 4, actualReps: 10, actualWeight: 60, notes: "خیلی خوب بود",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.log.actualSets).toBe(4);
  });
});