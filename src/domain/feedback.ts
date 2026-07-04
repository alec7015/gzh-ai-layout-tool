export type FeedbackTone = "idle" | "success" | "error" | "info";

export interface Feedback {
  tone: FeedbackTone;
  message: string;
}

export function createFeedback(tone: FeedbackTone, message: string): Feedback {
  return { tone, message };
}

export function feedbackText(feedback: Feedback): string {
  return feedback.message;
}
