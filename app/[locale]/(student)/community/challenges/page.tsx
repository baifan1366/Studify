import React from "react";

// --- Mock Data ---
const activeChallenges = [
  {
    id: 1,
    title: "Weekly Content Sprint",
    description: "Publish 3 new posts in any study group this week.",
    progress: 1,
    total: 3,
    reward: '150 XP & "Sprint" Badge',
    timeRemaining: "4 days left",
  },
  {
    id: 2,
    title: "Helpful Hand Challenge",
    description: "Provide 5 helpful replies to other members' questions.",
    progress: 3,
    total: 5,
    reward: "200 XP",
    timeRemaining: "6 days left",
  },
];

const completedChallenges = [
  {
    id: 3,
    title: "Icebreaker Challenge",
    description: "Introduce yourself in the #introductions channel.",
    completedDate: "2023-09-25",
  },
];

// --- SVG Icon Components ---
const TargetIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const GiftIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect width="20" height="5" x="2" y="7" />
    <line x1="12" x2="12" y1="22" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

// --- Main Page Component ---
export default function ChallengesPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen text-gray-800">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Community Challenges
          </h1>
          <p className="text-md text-gray-600 mt-2">
            Complete tasks to earn rewards and help the community grow.
          </p>
        </header>

        {/* Active Challenges Section */}
        <section id="active-challenges">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <TargetIcon className="w-6 h-6 mr-3 text-blue-600" />
            Active Challenges
          </h2>
          <div className="space-y-6">
            {activeChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <h3 className="font-bold text-xl text-gray-900">
                  {challenge.title}
                </h3>
                <p className="text-gray-600 mt-1 mb-4">
                  {challenge.description}
                </p>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      Progress
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {challenge.progress} / {challenge.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{
                        width: `${
                          (challenge.progress / challenge.total) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center mb-2 sm:mb-0">
                    <GiftIcon className="w-4 h-4 mr-2" />
                    <span>
                      Reward:{" "}
                      <span className="font-semibold text-gray-700">
                        {challenge.reward}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="w-4 h-4 mr-2" />
                    <span>{challenge.timeRemaining}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Completed Challenges Section */}
        <section id="completed-challenges" className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <CheckCircleIcon className="w-6 h-6 mr-3 text-green-600" />
            Completed Challenges
          </h2>
          <div className="space-y-4">
            {completedChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className="bg-white/80 p-4 rounded-lg border border-gray-200 flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold text-gray-700">
                    {challenge.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Completed on {challenge.completedDate}
                  </p>
                </div>
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
