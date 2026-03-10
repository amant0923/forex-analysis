"use client";

import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Lock, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ChatPage() {
  const [access, setAccess] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    try {
      const res = await fetch("/api/ai/chat");
      if (res.status === 403) {
        setAccess("denied");
      } else {
        setAccess("allowed");
      }
    } catch {
      setAccess("denied");
    }
  }

  if (access === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (access === "denied") {
    return (
      <div className="max-w-lg mx-auto mt-20">
        <Card>
          <CardContent className="flex flex-col items-center text-center py-12 px-8 space-y-4">
            <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center">
              <Lock className="h-7 w-7 text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              AI Chat Assistant
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              AI Chat Assistant is a Premium feature. Upgrade to get personalized
              trading insights from your trade history.
            </p>
            <Button asChild className="mt-2">
              <Link href="/settings/billing">Upgrade to Premium</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-indigo-600" />
        <h1 className="text-xl font-semibold text-gray-900">AI Chat Assistant</h1>
      </div>
      <ChatInterface />
    </div>
  );
}
