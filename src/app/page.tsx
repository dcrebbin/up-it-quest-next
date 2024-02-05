"use client";

import TutorInterviewPane from "../components/tutor-interview-pane";
import UserInterviewPane from "../components/user-interview-pane";
import { use, useEffect, useRef, useState } from "react";
import FormData from "form-data";

import AppBar from "@/components/app-bar";
import ChatPane from "@/components/chat-pane";
import Settings from "@/components/settings";
import { PlayIcon, StopIcon } from "@heroicons/react/20/solid";

export interface MessageSchema {
  role: "assistant" | "user" | "system" | "question";
  content: string;
}

export default function Home() {
  const [problemStarted, setProblemStarted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isEmojiTalking, setIsEmojiTalking] = useState(false);
  const [question, setQuestion] = useState({ __html: "" });
  const audio = useRef<HTMLAudioElement>(null);
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);
  const [store, updateStore] = useState({
    interviewSettings: {
      targetRole: "tutor",
      codingInterview: false,
    },
  });

  const initialPrompt = "Hi, I'm Clara. Welcome to Up It Quest! An AI interview preparation platform!";
  const defaultContextSchema: MessageSchema = {
    role: "assistant",
    content: initialPrompt,
  };

  const [openAiApiKey, setOpenAiApiKey] = useState("");
  const [content, setContent]: any[] = useState([defaultContextSchema]);
  const [messagesArray, setMessagesArray] = useState([defaultContextSchema]);
  const [speechToTextLoading, setSpeechToTextLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    setOpenAiApiKey(window.localStorage.getItem("OPEN_AI_API_KEY") ?? "");
    setAutoPlay(window.localStorage.getItem("AUTO_PLAY") === "true");
  }, []);

  const defaultCode = `#include <iostream>

using namespace std;

int main() {
  cout << "Hello, World!";
  return 0;
}`;
  const [code, setCode] = useState(defaultCode);

  const [whisperIsLoading, setWhisperIsLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function resetMessage() {
    setMessagesArray([defaultContextSchema]);
    setContent([defaultContextSchema]);
  }

  function updateQuestion(question: string) {
    resetMessage();
    setQuestion({ __html: question });
    messagesArray.push({ role: "assistant", content: question });
    setMessagesArray(messagesArray);
  }

  async function sendMessage() {
    const inputValue = input.current!.value || "";
    const newMessage = { content: inputValue, role: "user" };
    if (inputValue == "") {
      return;
    }
    const conversationArray = content;
    console.log(content);
    conversationArray.push(newMessage);
    await setContent(conversationArray);
    setIsLoading(true);
    retrievedMessage(inputValue);
    input.current!.value = "";
  }

  async function retrievedMessage(inputValue: string) {
    updateMessagesArray(inputValue);
    const response = await fetch("/api/generate-message", {
      headers: {
        "x-api-key": openAiApiKey ?? "",
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ messages: messagesArray }),
    });
    const generatedMessage = await response.json();
    console.log(generatedMessage);
    setMessagesArray((prevState) => [...prevState, generatedMessage]);
    const conversationArray = content;
    conversationArray.push(generatedMessage);
    if (autoPlay) {
      textToSpeech(generatedMessage.content);
    }
    setContent(conversationArray);
    setIsLoading(false);
  }

  let interval: any = null;

  function startTalking() {
    interval = setInterval(() => {
      setIsEmojiTalking((prevState) => !prevState);
    }, 200);
    return () => clearInterval(interval);
  }
  async function textToSpeech(inputString: string) {
    setSpeechToTextLoading(true);
    const data = {
      text: inputString,
    };
    const response = await fetch("/api/text-to-speech", {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "x-api-key": openAiApiKey ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const audioBlob = await response.blob();
    setSpeechToTextLoading(false);
    const audioUrl = URL.createObjectURL(audioBlob);
    audio.current!.src = audioUrl;
    audio.current!.volume = 0.5;
    audio.current!.play();

    setIsEmojiTalking(true);
    startTalking();
    audio.current!.onended = () => {
      clearInterval(interval);
      setIsEmojiTalking(false);
    };
  }

  async function whisperRequest(audioBlob: any) {
    setWhisperIsLoading(true);
    const audio = new File([audioBlob], "audio.wav");
    const formData: any = new FormData();
    formData.append("file", audio);
    const request: any = await fetch("/api/speech-to-text", {
      method: "POST",
      headers: {
        "x-api-key": openAiApiKey ?? "",
      },
      body: formData,
    });
    const { transcript } = await request.json();
    if (!input.current) return;
    input.current.value = transcript;
    setWhisperIsLoading(false);
    console.log(transcript);
    sendMessage();
  }

  const updateMessagesArray = (newMessage: string) => {
    const newMessageSchema: MessageSchema = {
      role: "user",
      content: `message: ${newMessage} \n code: ${code}`,
    };
    messagesArray.push(newMessageSchema);
    setMessagesArray(messagesArray);
  };

  function getSelectionText() {
    let text = "";
    if (window.getSelection) {
      text = window.getSelection()?.toString() ?? "";
    } else if (document.getSelection() && document.getSelection()?.type != "Control") {
      text = document.getSelection()?.addRange.toString() ?? "";
    }
    return text;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[url(/images/up-it-quest-background.svg)] items-stretch">
      <AppBar setSettingsOpen={setSettingsOpen}></AppBar>
      <audio ref={audio} id="audio">
        <track kind="captions" />
      </audio>
      {settingsOpen || !openAiApiKey ? <Settings updateQuestion={updateQuestion} setCode={setCode} setAutoPlay={setAutoPlay} autoPlay={autoPlay} openAiApiKey={openAiApiKey} setOpenAiApiKey={setOpenAiApiKey} setSettingsOpen={setSettingsOpen}></Settings> : null}
      <main className="bg-blue-400 self-stretch flex flex-grow">
        <div className="bg-green-400 w-full p-2">
          <ChatPane setCode={setCode} code={code} whisperIsLoading={whisperIsLoading} isLoading={isLoading} speechToTextLoading={speechToTextLoading} content={content} input={input} sendMessage={sendMessage} textToSpeech={textToSpeech}></ChatPane>
        </div>
        <div className="bg-yellow-300 w-full p-2 flex items-center flex-col">
          <div className="w-full h-full flex relative">
            <div className="w-[40vw] max-w-[23vw] relative">
              {question.__html == "" ? null : (
                <button
                  className="bg-black/25 p-1 rounded-md absolute bottom-0 right-0 m-6 drop-shadow-md z-10"
                  onClick={() => {
                    if (isPlayingQuestion) {
                      audio.current!.pause();
                      audio.current!.currentTime = 0;
                    } else {
                      const selectedText = getSelectionText();
                      if (selectedText.length === 0) {
                        alert("Please select some text to play");
                        return;
                      }
                      textToSpeech(selectedText);
                    }
                  }}
                >
                  {isPlayingQuestion ? <StopIcon className="w-8 h-8 text-white"></StopIcon> : <PlayIcon className="w-8 h-8 text-white"></PlayIcon>}
                </button>
              )}
              <div className="m bg-white overflow-scroll px-2 h-[45vh] w-full" dangerouslySetInnerHTML={question}></div>
            </div>
            <TutorInterviewPane problemStarted={false} interviewSettings={store.interviewSettings} updateTargetRole={null} updateCodingInterview={null} isEmojiTalking={isEmojiTalking}></TutorInterviewPane>
          </div>
          <UserInterviewPane whisperRequest={whisperRequest} restartInterview={null} setIsAwaitingMessageResponse={null} sendMessage={sendMessage}></UserInterviewPane>
        </div>
      </main>
    </div>
  );
}
