import React from 'react';

export const ArticlePage: React.FC = () => {
  return (
    <div className="flex flex-col h-full p-8 pt-28 overflow-y-auto bg-gray-50 text-black">
      <div className="w-full max-w-3xl mx-auto">
        <header className="mb-12">
          <p className="text-base text-blue-600 font-semibold mb-2">Feature Update</p>
          <h1 className="text-5xl font-bold text-black mb-4 leading-tight tracking-tighter">
            Silo Build Now Codes in Real-Time
          </h1>
          <p className="text-xl text-gray-600">
            We've supercharged our AI with Gemini's streaming capabilities, transforming the development experience from a waiting game into a live performance.
          </p>
          <p className="text-sm text-gray-500 mt-4">Published on October 17, 2025</p>
        </header>

        <article className="max-w-none text-lg text-gray-800 leading-relaxed space-y-6">
          <p>
            Until today, building with AI felt like a series of black boxes. You'd write a prompt, hit 'Send', and wait. A loading indicator would spin, leaving you to wonder what was happening behind the scenes. Was the AI working? Was it stuck? You'd only find out when the entire project suddenly appeared.
          </p>
          <p className="font-semibold">
            Today, that all changes.
          </p>
          <p>
            We're thrilled to introduce Real-Time Code Generation in Silo Build, a groundbreaking feature powered by the streaming capabilities of the Gemini API. Now, you can watch your application come to life, instantly.
          </p>

          <h2 className="text-3xl font-bold text-black pt-8 pb-2">A Live Development Experience</h2>
          <p>
            Instead of waiting for a completed build, you now have a front-row seat to the entire creation process. This isn't just a cosmetic update; it's a fundamental shift in how you interact with AI-driven development, providing unprecedented transparency and immediate feedback.
          </p>
          <ul className="list-disc list-inside space-y-4 pl-4">
            <li>
              <strong>Instant Code Streaming:</strong> See code appear in the editor character-by-character, just as if a developer were typing it live. No more guessing if the AI is making progress.
            </li>
            <li>
              <strong>Dynamic File Creation:</strong> The file explorer is no longer static. Watch as new files and folders pop into existence in real-time as the AI structures your project according to its plan.
            </li>
            <li>
              <strong>Live Task Tracking:</strong> The file checklist in the chat panel now ticks off files the moment they are completed, giving you a clear, at-a-glance view of the build's progress.
            </li>
          </ul>

          <blockquote className="border-l-4 border-blue-500 my-8 pl-4 py-2 italic text-gray-600">
            "The future of development is here, and it's instant. Seeing the AI think and build live feels like magic."
          </blockquote>

          <h2 className="text-3xl font-bold text-black pt-8 pb-2">Why It Matters</h2>
          <p>
            This new, transparent process does more than just look impressive. It allows you to spot potential architectural issues or deviations from your prompt much earlier. By seeing the code as it's written, you can prepare your next instruction or correction more effectively, leading to a faster, more iterative, and more collaborative workflow.
          </p>

          <div className="text-center py-8">
            <a href="#/home" className="inline-block px-8 py-4 bg-black text-white rounded-full font-semibold text-lg hover:bg-zinc-800 transition-colors shadow-lg">
              Experience Real-Time Building
            </a>
          </div>
        </article>
      </div>
    </div>
  );
};