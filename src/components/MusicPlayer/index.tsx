import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Music, Pause } from "lucide-react";
import { weddingConfig } from "@/config/config";

const STORAGE_KEY = "vg-music-paused";

/**
 * Persistent floating music control backed by a hidden YouTube iframe.
 * Playback starts once the user enters the site from the start screen.
 */
export default function MusicPlayer({ autoStart = false }: { autoStart?: boolean }) {
  const reduce = useReducedMotion();
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  const command = useCallback((func: string, args: unknown[] = []) => {
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
    );
  }, []);

  const fadeTo = useCallback(
    (target: number) => {
      let v = target === 0 ? 60 : 0;
      command("setVolume", [v]);
      const id = setInterval(() => {
        v += target === 0 ? -10 : 10;
        command("setVolume", [Math.max(0, Math.min(60, v))]);
        if ((target === 0 && v <= 0) || (target > 0 && v >= 60)) clearInterval(id);
      }, 60);
    },
    [command],
  );

  const play = useCallback(() => {
    command("playVideo");
    fadeTo(60);
    setPlaying(true);
    sessionStorage.removeItem(STORAGE_KEY);
  }, [command, fadeTo]);

  const pause = useCallback(() => {
    fadeTo(0);
    setTimeout(() => command("pauseVideo"), 400);
    setPlaying(false);
    sessionStorage.setItem(STORAGE_KEY, "1");
  }, [command, fadeTo]);

  // Start music after the user has entered from the start screen.
  useEffect(() => {
    if (!ready || !autoStart) return;
    if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    play();
    const retry = setTimeout(() => {
      if (sessionStorage.getItem(STORAGE_KEY) !== "1") play();
    }, 700);
    return () => clearTimeout(retry);
  }, [ready, autoStart, play]);

  const src = `https://www.youtube-nocookie.com/embed/${weddingConfig.backgroundMusicId}?enablejsapi=1&autoplay=1&loop=1&controls=0&playsinline=1&playlist=${weddingConfig.backgroundMusicId}`;


  return (
    <>
      <iframe
        ref={frameRef}
        title="Background music"
        src={src}
        allow="autoplay; encrypted-media"
        aria-hidden="true"
        tabIndex={-1}
        onLoad={() => setReady(true)}
        className="pointer-events-none fixed -left-[9999px] h-px w-px opacity-0"
      />

      <motion.button
        type="button"
        onClick={() => {
          playing ? pause() : play();
        }}


        aria-pressed={playing}
        aria-label={playing ? "Pause background music" : "Play background music"}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.4 }}
        className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-wedding-border bg-wedding-surface text-wedding-primary shadow-[var(--shadow-paper)] transition-colors hover:bg-wedding-primary hover:text-primary-foreground"
      >
        <motion.span
          animate={playing && !reduce ? { rotate: 360 } : { rotate: 0 }}
          transition={
            playing && !reduce
              ? { duration: 6, repeat: Infinity, ease: "linear" }
              : { duration: 0.3 }
          }
          className="inline-flex"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Music className="h-5 w-5" />}
        </motion.span>
      </motion.button>
    </>
  );
}
