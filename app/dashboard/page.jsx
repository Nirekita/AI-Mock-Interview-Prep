"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Bot, Plus, ListChecks, Trophy, Zap, TrendingUp } from "lucide-react";
import { db } from "@/utils/db";
import { UserAnswer } from "@/utils/schema";
import { eq } from "drizzle-orm";
import AddNewInterview from "./_components/AddNewInterview";
import InterviewList from "./_components/InterviewList";

function Dashboard() {
  const { user } = useUser();
  const [interviewData, setInterviewData] = useState([]);
  const [isNewInterviewModalOpen, setIsNewInterviewModalOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    bestScore: null,
    improvementRate: 0,
  });

  // FIX: Query DB directly instead of going through an API route
  // This removes the extra network hop that was causing slow loads
  const fetchInterviews = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) return;

    try {
      const results = await db
        .select()
        .from(UserAnswer)
        .where(eq(UserAnswer.userEmail, user.primaryEmailAddress.emailAddress));

      setInterviewData(results);

      const total = results.length;
      const ratings = results
        .map((r) => parseInt(r.rating || "0"))
        .filter((r) => !isNaN(r));

      const bestScore = ratings.length > 0 ? Math.max(...ratings) : null;

      // FIX: Infinity% was caused by dividing by scores[0] when it was 0
      // New logic: compare first half avg vs second half avg of chronological scores
      const improvementRate = calculateImprovementRate(results);

      setStats({ total, bestScore, improvementRate });
    } catch (error) {
      console.error("Error fetching interviews:", error);
      toast.error("Failed to load interview data");
    }
  };

  // FIX: Safe improvement rate — no division by zero
  const calculateImprovementRate = (interviews) => {
    if (interviews.length < 2) return 0;

    // Sort by date ascending (oldest first)
    const sorted = [...interviews].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    const ratings = sorted
      .map((r) => parseInt(r.rating || "0"))
      .filter((r) => !isNaN(r));

    if (ratings.length < 2) return 0;

    const firstScore = ratings[0];
    const lastScore = ratings[ratings.length - 1];

    // If first score is 0, just return the difference as a flat number
    if (firstScore === 0) return lastScore > 0 ? 100 : 0;

    const rate = Math.round(((lastScore - firstScore) / firstScore) * 100);
    return rate;
  };

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      fetchInterviews();
    }
  }, [user]);

  const statsCards = [
    {
      icon: <ListChecks size={32} className="text-indigo-600" />,
      title: "Total Interviews",
      value: stats.total.toString(),
    },
    {
      icon: <Trophy size={32} className="text-green-600" />,
      title: "Best Score",
      value: stats.bestScore !== null ? `${stats.bestScore}/10` : "N/A",
    },
    {
      icon: <TrendingUp size={32} className="text-blue-600" />,
      title: "Improvement Rate",
      value: `${stats.improvementRate}%`,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* User Greeting */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Bot className="text-indigo-600" size={32} />
            Dashboard
          </h2>
          <h3 className="text-lg sm:text-xl text-gray-600 mt-2">
            Welcome, {user?.firstName || "Interviewer"}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm sm:text-base">
            {user?.primaryEmailAddress?.emailAddress || "Not logged in"}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {statsCards.map((card) => (
          <div
            key={card.title}
            className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center"
          >
            {card.icon}
            <div className="ml-4">
              <p className="text-xs sm:text-sm text-gray-500">{card.title}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Interview Section */}
      <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 space-y-4 sm:space-y-0">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 flex items-center gap-3">
            <Zap size={24} className="text-yellow-500" />
            Create AI Mock Interview
          </h2>
          <button
            onClick={() => setIsNewInterviewModalOpen(true)}
            className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} className="mr-2" />
            New Interview
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <AddNewInterview
            isOpen={isNewInterviewModalOpen}
            onClose={() => setIsNewInterviewModalOpen(false)}
          />
        </div>
      </div>

      {/* Interview History */}
      <div className="mt-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6">
          Interview History
        </h2>
        <InterviewList interviews={interviewData} />
      </div>
    </div>
  );
}

export default Dashboard;