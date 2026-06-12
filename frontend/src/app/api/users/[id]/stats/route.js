import { NextResponse } from "next/server";
import { query } from "../../../../lib/pg_db";

export async function GET(req, { params }) {
  try {
    const { id: userId } = params;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // 1. Fetch user general information
    const userRes = await query(
      "SELECT id, username, avatar_url, total_matches, wins, losses FROM users_user WHERE id = $1",
      [userId]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userRes.rows[0];

    // 2. Fetch Court Piece (Rung) specific stats (courts and coats) from matches_match
    const matchesRes = await query(
      `SELECT 
        COUNT(CASE WHEN m.court_achieved = true AND 
          ((m.winning_team = 'A' AND EXISTS (SELECT 1 FROM matches_match_team_a ta WHERE ta.match_id = m.id AND ta.user_id = $1)) OR 
           (m.winning_team = 'B' AND EXISTS (SELECT 1 FROM matches_match_team_b tb WHERE tb.match_id = m.id AND tb.user_id = $1))) THEN 1 END) as courts,
        COUNT(CASE WHEN m.coat_achieved = true AND 
          ((m.winning_team = 'A' AND EXISTS (SELECT 1 FROM matches_match_team_a ta WHERE ta.match_id = m.id AND ta.user_id = $1)) OR 
           (m.winning_team = 'B' AND EXISTS (SELECT 1 FROM matches_match_team_b tb WHERE tb.match_id = m.id AND tb.user_id = $1))) THEN 1 END) as coats
      FROM matches_match m
      WHERE EXISTS (SELECT 1 FROM matches_match_team_a ta WHERE ta.match_id = m.id AND ta.user_id = $1)
         OR EXISTS (SELECT 1 FROM matches_match_team_b tb WHERE tb.match_id = m.id AND tb.user_id = $1)`,
      [userId]
    );

    const courtsCount = parseInt(matchesRes.rows[0]?.courts || 0);
    const coatsCount = parseInt(matchesRes.rows[0]?.coats || 0);

    // Calculate level based on wins (e.g. 1 level per 50 wins, starting at 1)
    const rungLevel = Math.max(1, Math.floor((user.wins || 0) / 50) + 1);

    // 3. Construct stats list including placeholders/mock data for future games (Blind, Bhabhi, Seep)
    const stats = [
      {
        game: "Rung",
        games: user.total_matches || 0,
        wins: user.wins || 0,
        loses: user.losses || 0,
        courts: courtsCount,
        gcs: coatsCount,
        level: rungLevel
      },
      {
        game: "Blind",
        games: 0,
        wins: 0,
        loses: 0,
        courts: 0,
        gcs: 0,
        level: 1
      },
      {
        game: "Bhabhi",
        games: 0,
        wins: 0,
        loses: 0,
        courts: "-",
        gcs: "-",
        level: 1
      },
      {
        game: "Seep",
        games: 0,
        wins: 0,
        loses: 0,
        courts: "-",
        gcs: "-",
        level: 1
      }
    ];

    return NextResponse.json({
      username: user.username,
      avatar_url: user.avatar_url,
      stats
    });
  } catch (err) {
    console.error("Failed to fetch user stats:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
