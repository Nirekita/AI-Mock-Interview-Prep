"use client";
import { db } from "@/utils/db";
import { MockInterview } from "@/utils/schema";
import { eq } from "drizzle-orm";
import React, { useEffect, useState } from "react";
import QuestionsSection from "./_components/QuestionsSection";
import RecordAnswerSection from "./_components/RecordAnswerSection";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";

const StartInterview = ({ params }) => {
  const [interViewData, setInterviewData] = useState();
  const [mockInterviewQuestion, setMockInterviewQuestion] = useState();
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    GetInterviewDetails();
  }, []);

  const GetInterviewDetails = async () => {
    try {
      setIsLoading(true);
      const result = await db
        .select()
        .from(MockInterview)
        .where(eq(MockInterview.mockId, params.interviewId));

      const jsonMockResp = JSON.parse(result[0].jsonMockResp);

// Gemini sometimes returns { questions: [...] } instead of plain array
const questionsArray = Array.isArray(jsonMockResp)
  ? jsonMockResp
  : jsonMockResp?.questions || jsonMockResp?.interview_questions || Object.values(jsonMockResp)[0];

setMockInterviewQuestion(questionsArray);
      setInterviewData(result[0]);
    } catch (error) {
      console.error("Failed to fetch interview details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin" />
          <p className="mt-4 text-gray-600">Loading interview details...</p>
        </div>
      </div>
    );
  }

  if (!mockInterviewQuestion || mockInterviewQuestion.length === 0) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <p className="text-red-500">No interview questions found.</p>
      </div>
    );
  }

  return (
    // Use calc to subtract header height (64px) and layout margins (my-8 = 64px total)
    // This makes the page fit exactly in the remaining viewport without scrolling
    <div className="flex flex-col" style={{ height: "calc(100vh - 130px)" }}>

      {/* Main content — fills space above the bottom button bar */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">

        {/* Questions panel */}
        <div className="overflow-y-auto pr-2">
          <QuestionsSection
            mockInterviewQuestion={mockInterviewQuestion}
            activeQuestionIndex={activeQuestionIndex}
          />
        </div>

        {/* Record Answer panel */}
        <div className="overflow-y-auto pr-2">
          <RecordAnswerSection
            key={activeQuestionIndex}
            mockInterviewQuestion={mockInterviewQuestion}
            activeQuestionIndex={activeQuestionIndex}
            interviewData={interViewData}
            onAnswerSave={() => {
              if (activeQuestionIndex < mockInterviewQuestion.length - 1) {
                setActiveQuestionIndex((prev) => prev + 1);
              }
            }}
          />
        </div>
      </div>

      {/* Navigation buttons — pinned to bottom, always visible */}
      <div className="flex justify-end items-center gap-4 pt-3 border-t bg-white">
        {activeQuestionIndex > 0 && (
          <Button
            variant="outline"
            onClick={() => setActiveQuestionIndex(activeQuestionIndex - 1)}
          >
            Previous Question
          </Button>
        )}

        {activeQuestionIndex !== mockInterviewQuestion?.length - 1 && (
          <Button
            onClick={() => setActiveQuestionIndex(activeQuestionIndex + 1)}
          >
            Next Question
          </Button>
        )}

        {activeQuestionIndex === mockInterviewQuestion?.length - 1 && (
          <Link href={"/dashboard/interview/" + interViewData?.mockId + "/feedback"}>
            <Button variant="destructive">End Interview</Button>
          </Link>
        )}
      </div>

    </div>
  );
};

export default StartInterview;