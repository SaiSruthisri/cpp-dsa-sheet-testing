import { NextResponse } from "next/server";
import { connect } from "@/db/config";
import { Progress } from "@/models/Progress.model";
import { Badge } from "@/models/Badge.model";
import { awardBadges } from "@/lib/awardBadges";
interface TopicProgress {
  topicName: string;
  solvedCount: number;
  totalQuestions: number;
}

interface ProgressType {
  userId: string;
  lastVisited?: Date;
  streakCount: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSolved: number;
  topicsProgress: TopicProgress[];
  solvedQuestionKeys: string[];
  save: () => Promise<void>;
  toObject: () => object;
}
export async function POST(req: Request) {
  try {
    await connect();
    const { userId, questionDifficulty, topicName, topicTotalQuestions, solvedQuestionKey } = await req.json();

    if (!userId)
      return NextResponse.json({ message: "UserId required" }, { status: 400 });

    let progress = await Progress.findOne({ userId });
    if (!progress) {
      progress = await Progress.create({ userId });
    }

    // --- Streak Update ---
    const today = new Date();
    if (progress.lastVisited) {
      const diff = Math.floor(
        (today.getTime() - progress.lastVisited.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff === 1) progress.streakCount += 1;
      else if (diff > 1) progress.streakCount = 1;
    } else {
      progress.streakCount = 1;
    }
    progress.lastVisited = today;

    // --- Per-question idempotency ---
    let newlySolvedThisCall = false;
    if (solvedQuestionKey) {
      const already = progress.solvedQuestionKeys?.includes(solvedQuestionKey);
      if (!already) {
        progress.solvedQuestionKeys = [...(progress.solvedQuestionKeys || []), solvedQuestionKey];
        newlySolvedThisCall = true;
      }
    }

    // --- Difficulty Counters (only increment on first solve) ---
    if (newlySolvedThisCall && questionDifficulty) {
      if (questionDifficulty === "easy") progress.easySolved += 1;
      if (questionDifficulty === "medium") progress.mediumSolved += 1;
      if (questionDifficulty === "hard") progress.hardSolved += 1;

      progress.totalSolved =
        Number(progress.easySolved ?? 0) +
        Number(progress.mediumSolved ?? 0) +
        Number(progress.hardSolved ?? 0);
    }

    // --- Topic-wise Progress (optional) ---
    if (topicName && topicTotalQuestions) {
      const topicIndex: number = (progress as unknown as ProgressType).topicsProgress.findIndex(
        (t: TopicProgress) => t.topicName === topicName
      );

      if (topicIndex > -1) {
        if (progress.topicsProgress[topicIndex].solvedCount < topicTotalQuestions && newlySolvedThisCall) {
          progress.topicsProgress[topicIndex].solvedCount += 1;
        }
      } else {
        progress.topicsProgress.push({
          topicName,
          solvedCount: newlySolvedThisCall ? 1 : 0,
          totalQuestions: topicTotalQuestions
        });
      }
    }

    await progress.save();

    // --- Badges ---
    const badgeDoc = await Badge.findOne({ userId });
    const currentBadges = badgeDoc?.badges || [];

    await awardBadges(userId, { ...progress.toObject(), badges: currentBadges });

    const updatedBadges = await Badge.findOne({ userId });

    return NextResponse.json({
      message: "Progress updated",
      progress,
      badges: updatedBadges?.badges || []
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
