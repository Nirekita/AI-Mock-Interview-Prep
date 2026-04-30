"use client";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState, useRef, useMemo } from "react";
import Webcam from "react-webcam";
import { Mic, StopCircle, Loader2, CameraOff } from "lucide-react";
import { toast } from "sonner";
import { chatSession } from "@/utils/GeminiAIModal";
import { db } from "@/utils/db";
import { UserAnswer } from "@/utils/schema";
import { useUser } from "@clerk/nextjs";
import moment from "moment";
import useSpeechToText from "react-hook-speech-to-text";

const RecordAnswerSection = ({
  mockInterviewQuestion,
  activeQuestionIndex,
  interviewData,
  onAnswerSave,
}) => {
  const [userAnswer, setUserAnswer] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const sessionStartIndexRef = useRef(0);

  const {
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
    speechRecognitionProperties: {
      lang: "en-IN",
      interimResults: true,
      maxAlternatives: 1,
    },
  });

  // Only use results from current session
  useEffect(() => {
    const currentSessionResults = results.slice(sessionStartIndexRef.current);
    if (currentSessionResults.length > 0) {
      const combined = currentSessionResults.map((r) => r.transcript).join(" ");
      setUserAnswer(combined);
    }
  }, [results]);

  // Show live interim text while speaking
  const displayedText = useMemo(() => {
    return interimResult ? `${userAnswer} ${interimResult}` : userAnswer;
  }, [userAnswer, interimResult]);

  // Reset when question changes
  useEffect(() => {
    setUserAnswer("");
    sessionStartIndexRef.current = results.length;
    if (isRecording) stopSpeechToText();
  }, [activeQuestionIndex]);

  const handleRecordToggle = () => {
    if (isRecording) {
      stopSpeechToText();
    } else {
      // Stop any existing session first before starting a new one
      try { stopSpeechToText(); } catch (e) {}
      setTimeout(() => {
        sessionStartIndexRef.current = results.length;
        setUserAnswer("");
        startSpeechToText();
      }, 300); // small delay ensures previous session fully stops before new one starts
    }
  };

  const UpdateUserAnswer = async () => {
    const finalAnswer = userAnswer.trim();

    if (finalAnswer.length < 10) {
      toast.error("Answer too short. Please speak or type a bit more.");
      return;
    }

    if (isRecording) stopSpeechToText();
    setLoading(true);

    try {
      const currentQuestion = mockInterviewQuestion[activeQuestionIndex]?.question;
      const loadingToast = toast.loading("AI is analyzing your answer...");

      const feedbackPrompt = `Q: ${currentQuestion}, Ans: ${finalAnswer}. Return JSON only: {"rating":0-10,"feedback":"string"}`;

      const result = await chatSession.sendMessage(feedbackPrompt);
      const rawJson = result.response.text().replace(/```json|```/g, "").trim();
      const feedback = JSON.parse(rawJson);

      await db.insert(UserAnswer).values({
        mockIdRef: interviewData?.mockId,
        question: currentQuestion,
        correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
        userAns: finalAnswer,
        feedback: feedback.feedback,
        rating: feedback.rating,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        createdAt: moment().format("DD-MM-YYYY"),
      });

      toast.dismiss(loadingToast);
      toast.success("Answer saved!");

      setUserAnswer("");
      sessionStartIndexRef.current = results.length;
      onAnswerSave?.();

    } catch (err) {
      console.error(err);
      toast.error("Save failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-2">

      {/* Webcam — compact size */}
      <div className="flex flex-col items-center bg-black rounded-xl p-3">
        {webcamEnabled ? (
          <Webcam
            mirrored
            style={{ width: "100%", maxWidth: 280, height: 200, objectFit: "cover", borderRadius: 8 }}
          />
        ) : (
          <div className="w-full max-w-[280px] h-[200px] bg-zinc-900 flex items-center justify-center rounded-lg text-zinc-500">
            <CameraOff size={40} />
          </div>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => setWebcamEnabled(!webcamEnabled)}
        >
          {webcamEnabled ? "Disable Camera" : "Enable Camera"}
        </Button>
      </div>

      {/* Mic status */}
      {isRecording && (
        <div className="flex items-center justify-center gap-2 text-red-500 animate-pulse">
          <Mic className="h-4 w-4" />
          <span className="text-sm font-medium">Listening... speak clearly</span>
        </div>
      )}

      {/* Record button */}
      <Button
        variant={isRecording ? "destructive" : "default"}
        onClick={handleRecordToggle}
        disabled={loading}
        className="w-full"
      >
        {isRecording ? (
          <><StopCircle className="mr-2 h-4 w-4" /> Stop Recording</>
        ) : (
          <><Mic className="mr-2 h-4 w-4" /> Start Recording</>
        )}
      </Button>

      {/* Answer textarea */}
      <div>
        <p className="text-xs text-gray-400 mb-1">
          💡 Your spoken answer appears below. You can also type or edit directly.
        </p>
        <textarea
          className="w-full h-28 p-3 border rounded-xl bg-white shadow-sm outline-none focus:border-blue-500 transition-all text-gray-800 text-sm resize-none"
          placeholder="Your words will appear here as you speak..."
          value={displayedText}
          onChange={(e) => setUserAnswer(e.target.value)}
        />
      </div>

      {/* Save button */}
      <Button
        onClick={UpdateUserAnswer}
        disabled={loading || displayedText.length < 5}
        className="w-full"
      >
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
        ) : (
          "Save Answer"
        )}
      </Button>

    </div>
  );
};

export default RecordAnswerSection;