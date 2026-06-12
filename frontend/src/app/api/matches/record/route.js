import { NextResponse } from "next/server";
import { pool } from "../../../../lib/pg_db";

export async function POST(req) {
  let client;
  try {
    const body = await req.json();
    const {
      room_id,
      team_a_user_ids,
      team_b_user_ids,
      winning_team,
      score_a,
      score_b,
      court_achieved,
      coat_achieved,
      started_at,
    } = body;

    if (!room_id || !team_a_user_ids || !team_b_user_ids || !winning_team) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Connect a single client from the pool to handle the transaction atomically
    client = await pool.connect();
    await client.query("BEGIN");

    try {
      // 1. Insert the match
      const insertMatchSql = `
        INSERT INTO matches_match (
          room_id, winning_team, score_a, score_b, court_achieved, coat_achieved, started_at, ended_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id;
      `;
      const matchResult = await client.query(insertMatchSql, [
        room_id,
        winning_team,
        score_a || 0,
        score_b || 0,
        !!court_achieved,
        !!coat_achieved,
        started_at || new Date().toISOString(),
      ]);

      const matchId = matchResult.rows[0].id;

      // 2. Link team A players
      for (const userId of team_a_user_ids) {
        await client.query(
          "INSERT INTO matches_match_team_a (match_id, user_id) VALUES ($1, $2)",
          [matchId, userId]
        );
        const isWin = winning_team === "A";
        await client.query(
          `UPDATE users_user 
           SET total_matches = total_matches + 1, 
               wins = wins + ${isWin ? 1 : 0}, 
               losses = losses + ${isWin ? 0 : 1}
           WHERE id = $1`,
          [userId]
        );
      }

      // 3. Link team B players
      for (const userId of team_b_user_ids) {
        await client.query(
          "INSERT INTO matches_match_team_b (match_id, user_id) VALUES ($1, $2)",
          [matchId, userId]
        );
        const isWin = winning_team === "B";
        await client.query(
          `UPDATE users_user 
           SET total_matches = total_matches + 1, 
               wins = wins + ${isWin ? 1 : 0}, 
               losses = losses + ${isWin ? 0 : 1}
           WHERE id = $1`,
          [userId]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, matchId });
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    }
  } catch (err) {
    console.error("Failed to record match in Postgres transaction:", err);
    return NextResponse.json({ error: "Database transaction failed", details: err.message }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}
