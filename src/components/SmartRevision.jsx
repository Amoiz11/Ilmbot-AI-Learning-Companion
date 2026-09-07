import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import RobotMascot from './RobotMascot';
import { scrollToTop } from '../utils/scrollToTop';
import './SmartRevision.css';

const FlashcardModal = React.lazy(() => import('./FlashcardModal'));
const QuizModule = React.lazy(() => import('./revision/QuizModule'));
const AnalyticsMasteryPanel = React.lazy(() => import('./revision/AnalyticsMasteryPanel'));

// SVG Icons
const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const ArrowRightIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="-2 -2 28 28"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ overflow: 'visible', flexShrink: 0, display: 'block' }}
  >
    <line x1="4" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const BookOpenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const XCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5252" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

const RefreshCwIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

const AwardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7"></circle>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
  </svg>
);

const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path>
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const KeyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
  </svg>
);

const CardsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="14" height="14" rx="2"></rect>
    <path d="M17 14h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"></path>
  </svg>
);

const TargetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

// Mock Dataset for Previous Learning Sessions
const MOCK_SESSIONS = [
  {
    id: 'newtons-laws',
    legacyId: 's1',
    topic: "Newton's Laws of Motion",
    module: "Learning Coach",
    badgeClass: "badge-learning",
    date: "2 hours ago",
    estTime: "5 min read",
    summary: [
      "Newton's Laws of Motion form the foundation of classical mechanics, describing how objects interact through forces to alter their states of motion.",
      "The First Law establishes inertia, stating that an object remains at rest or moves at a constant velocity unless acted upon by a net external force. The Second Law quantifies this relationship as F = ma, linking force, mass, and acceleration.",
      "The Third Law highlights action and reaction pairs, asserting that every force exerted by one object onto another produces an equal and opposite force back onto the first object."
    ],
    keyConcepts: [
      { title: "First Law (Inertia)", desc: "Objects resist changes in their velocity; without a net force, acceleration is zero." },
      { title: "Second Law (F = ma)", desc: "Acceleration is directly proportional to net force and inversely proportional to mass." },
      { title: "Third Law (Action-Reaction)", desc: "Forces occur in equal and opposite pairs acting on different interacting bodies." },
      { title: "Mass vs Weight", desc: "Mass is an intrinsic scalar quantity (kg), while weight is the gravitational force (W = mg)." }
    ],
    importantPoints: [
      "Always draw a clear Free-Body Diagram (FBD) including all external forces acting ON the system.",
      "Resolve vectors into perpendicular (x, y) components before calculating net forces.",
      "Static friction increases up to a maximum limit (f_s <= mu_s * N), whereas kinetic friction is constant (f_k = mu_k * N).",
      "Translational equilibrium requires net force = 0, which means constant velocity (not necessarily zero velocity)."
    ],
    commonMistakes: [
      "Confusing normal force and gravity as an action-reaction pair (they act on the SAME body).",
      "Adding force magnitudes scalar-wise without decomposing vectors into x and y axes.",
      "Using weight instead of mass in the F = ma equation."
    ],
    quizQuestions: [
      {
        question: "According to Newton's First Law, what happens to a moving spacecraft in deep space when its thrusters are turned off?",
        options: [
          "It immediately comes to a stop.",
          "It continues moving at a constant speed in a straight line.",
          "It gradually slows down due to spatial friction.",
          "It begins to orbit the nearest star."
        ],
        correct: 1,
        explanation: "In deep space without external forces (gravity/friction), an object maintains its velocity due to inertia."
      },
      {
        question: "If a net force of 30 N acts on a 6 kg object, what is its acceleration?",
        options: ["0.2 m/s²", "5 m/s²", "180 m/s²", "36 m/s²"],
        correct: 1,
        explanation: "Using F = ma => a = F / m = 30 / 6 = 5 m/s²."
      },
      {
        question: "A book sits at rest on a flat table. What is the action-reaction counterpart to the normal force exerted by the table on the book?",
        options: [
          "The gravitational force pulling the book down.",
          "The upward push of the book on the earth.",
          "The downward force exerted by the book on the table.",
          "The friction force of the table surface."
        ],
        correct: 2,
        explanation: "Newton's Third Law pairs involve mutual forces between two bodies (Table pushes Book UP <-> Book pushes Table DOWN)."
      },
      {
        question: "What is the weight of a 10 kg block on Earth (take g = 9.8 m/s²)?",
        options: ["10 N", "98 N", "0.98 N", "980 N"],
        correct: 1,
        explanation: "Weight W = mg = 10 kg * 9.8 m/s² = 98 N."
      },
      {
        question: "When a car accelerates forward, what force propels the car forward relative to the ground?",
        options: [
          "The internal combustion engine force.",
          "Static friction force exerted by the road on the tires.",
          "Air resistance acting on the hood.",
          "Normal force from the seat."
        ],
        correct: 1,
        explanation: "The tires push backward on the road, and by Newton's 3rd law, the road pushes forward on the tires via static friction."
      }
    ]
  },
  {
    id: 'recursion-dp',
    legacyId: 's2',
    topic: "Recursion & Dynamic Programming",
    module: "Coding Coach",
    badgeClass: "badge-coding",
    date: "Yesterday",
    estTime: "6 min read",
    summary: [
      "Recursion solves complex problems by breaking them down into smaller self-similar subproblems until reaching a base case.",
      "Dynamic Programming (DP) optimizes recursive solutions that exhibit overlapping subproblems and optimal substructure by memoizing or tabulating subproblem results.",
      "Transitioning from naive recursive O(2^N) time to Memoized/Tabulated O(N) time drastically improves computational performance for algorithms like Fibonacci, Knapsack, and Longest Common Subsequence."
    ],
    keyConcepts: [
      { title: "Base Case", desc: "The explicit stopping condition that prevents infinite stack recursion." },
      { title: "Call Stack", desc: "Stack frames pushed on function call and popped on return (requires O(N) memory)." },
      { title: "Top-Down (Memoization)", desc: "Stores computed recursive function results in a hash table or lookup array." },
      { title: "Bottom-Up (Tabulation)", desc: "Fills a DP table iteratively starting from base cases to the target value." }
    ],
    importantPoints: [
      "Identify the State Parameters (e.g., dp[i][j]) that uniquely define each subproblem.",
      "Formulate the Recurrence Relation before writing code.",
      "Check space complexity; DP tables can often be space-optimized from O(N^2) to O(N).",
      "Always verify base case initialization to prevent off-by-one boundary errors."
    ],
    commonMistakes: [
      "Forgetting or misconfiguring the base case, leading to Maximum Call Stack Exceeded errors.",
      "Not checking if a subproblem result is already memoized before executing recursive calls.",
      "Incorrect DP table array sizing (e.g., allocating size N instead of N+1 for 1-based indexing)."
    ],
    quizQuestions: [
      {
        question: "What is the primary condition required for Dynamic Programming to be applicable?",
        options: [
          "Graph greedy traversal and sorting",
          "Overlapping subproblems and optimal substructure",
          "Constant time memory allocation",
          "Tail-call optimization in hardware"
        ],
        correct: 1,
        explanation: "DP relies on reusing solutions to overlapping subproblems that compose the optimal global solution."
      },
      {
        question: "What is the time complexity of naive recursive Fibonacci vs memoized Fibonacci?",
        options: [
          "O(N) vs O(1)",
          "O(2^N) vs O(N)",
          "O(N^2) vs O(N log N)",
          "O(N!) vs O(N^2)"
        ],
        correct: 1,
        explanation: "Naive Fibonacci branches exponentially O(2^N), whereas memoization computes each state once in O(N) time."
      },
      {
        question: "Which approach builds solutions iteratively from smallest subproblems up to the final target?",
        options: ["Memoization", "Tabulation", "Backtracking", "Divide and Conquer"],
        correct: 1,
        explanation: "Tabulation is the bottom-up approach that fills an array iteratively from base cases up."
      },
      {
        question: "What error occurs if a recursive function lacks a valid base case?",
        options: ["Null Pointer Exception", "Call Stack Overflow", "Syntax Error", "Out of Memory Heap Error"],
        correct: 1,
        explanation: "Without a base case, recursion runs until exhausting the call stack frame limit."
      },
      {
        question: "In the 0/1 Knapsack problem, what does the DP state dp[i][w] typically represent?",
        options: [
          "Minimum weight considering first i items",
          "Maximum value considering first i items with weight capacity w",
          "Total count of items available",
          "Ratio of weight to profit"
        ],
        correct: 1,
        explanation: "dp[i][w] stores maximum value attainable using a subset of first i items within capacity limit w."
      }
    ]
  },
  {
    id: 'organic-chemistry',
    legacyId: 's3',
    topic: "Organic Chemistry Mechanisms",
    module: "Learning Coach",
    badgeClass: "badge-learning",
    date: "3 days ago",
    estTime: "4 min read",
    summary: [
      "Organic reaction mechanisms map the movement of electrons during chemical transformations using curved arrow notation.",
      "Nucleophilic substitution (SN1 vs SN2) and elimination (E1 vs E2) pathways depend on substrate structure, nucleophile strength, leaving group ability, and solvent polarity.",
      "Understanding carbocation stability, steric hindrance, and stereochemical outcomes allows accurate prediction of major reaction products."
    ],
    keyConcepts: [
      { title: "SN2 Reaction", desc: "Concerted 1-step backside attack resulting in stereochemical inversion (R to S)." },
      { title: "SN1 Reaction", desc: "Stepwise process via carbocation intermediate yielding racemic product mixtures." },
      { title: "Carbocation Stability", desc: "3° > 2° > 1° > methyl due to hyperconjugation and alkyl electron donation." },
      { title: "Zaitsev's Rule", desc: "Elimination yields the more substituted, thermodynamic alkene as major product." }
    ],
    importantPoints: [
      "Curved arrows ALWAYS point from electron source (lone pair or bond) to electron sink.",
      "Polar aprotic solvents (DMSO, Acetone) favor SN2 by enhancing nucleophile reactivity.",
      "Good leaving groups are weak conjugate bases (I- > Br- > Cl- > F-).",
      "Bulky bases (like t-BuOK) favor Hofmann (less substituted) elimination products."
    ],
    commonMistakes: [
      "Drawing curved arrows starting from positive charges instead of electron pairs.",
      "Expecting SN2 reactions on bulky tertiary (3°) alkyl halides.",
      "Ignoring carbocation rearrangements (1,2-hydride or alkyl shifts) in SN1/E1 mechanisms."
    ],
    quizQuestions: [
      {
        question: "Which mechanism involves a single concerted step with backside attack and inversion of configuration?",
        options: ["SN1", "SN2", "E1", "E2"],
        correct: 1,
        explanation: "SN2 occurs in one step with nucleophile attacking opposite the leaving group, inverting stereochemistry."
      },
      {
        question: "What is the correct order of carbocation stability from most to least stable?",
        options: [
          "Methyl > 1° > 2° > 3°",
          "3° > 2° > 1° > Methyl",
          "2° > 3° > 1° > Methyl",
          "1° > 2° > 3° > Methyl"
        ],
        correct: 1,
        explanation: "Tertiary (3°) carbocations are most stable due to inductive stabilization and hyperconjugation from 3 alkyl groups."
      },
      {
        question: "Which solvent type stabilizes carbocation intermediates and promotes SN1 reactions?",
        options: ["Polar Protic (e.g. H2O, Ethanol)", "Polar Aprotic (e.g. Acetone)", "Non-polar (e.g. Hexane)", "Gas phase"],
        correct: 0,
        explanation: "Polar protic solvents hydrogen-bond with leaving groups and solvate cations, favoring SN1 ionization."
      },
      {
        question: "Zaitsev's Rule predicts that elimination of an alkyl halide with a small base will primarily form:",
        options: [
          "The least substituted alkene",
          "The most substituted, stable alkene",
          "An alkyne",
          "A cyclic alkane"
        ],
        correct: 1,
        explanation: "Zaitsev's rule favors the more alkyl-substituted double bond because of its lower energy and greater thermodynamic stability."
      },
      {
        question: "Curved arrows in reaction mechanisms represent the movement of:",
        options: ["Protons", "Neutrons", "Electron pairs", "Atomic nuclei"],
        correct: 2,
        explanation: "Curved arrows explicitly trace the flow of electron pairs from donor to acceptor."
      }
    ]
  },
  {
    id: 'trees-bst',
    legacyId: 's4',
    topic: "Data Structures: Trees & BST",
    module: "Coding Coach",
    badgeClass: "badge-coding",
    date: "4 days ago",
    estTime: "5 min read",
    summary: [
      "Trees are hierarchical non-linear data structures composed of connected nodes, starting from a root node.",
      "Binary Search Trees (BST) maintain the spatial property where left child key < parent key < right child key, enabling efficient O(log N) average search, insertion, and deletion.",
      "Understanding tree traversals (In-order, Pre-order, Post-order, Level-order) is vital for algorithms on hierarchical data."
    ],
    keyConcepts: [
      { title: "BST In-Order Traversal", desc: "Visiting Left subtree -> Root -> Right subtree yields sorted element keys." },
      { title: "Balanced Trees (AVL/Red-Black)", desc: "Maintain tree height h = O(log N) to prevent degenerate linear behavior." },
      { title: "Level-Order Traversal (BFS)", desc: "Visits nodes level by level using a Queue data structure." },
      { title: "Height vs Depth", desc: "Height is distance to furthest leaf; depth is distance to the root." }
    ],
    importantPoints: [
      "Unbalanced BSTs can degrade to O(N) linked list performance for sorted inputs.",
      "Pre-order traversal (Root -> Left -> Right) is ideal for cloning tree structures.",
      "Post-order traversal (Left -> Right -> Root) is ideal for bottom-up node deletions/evaluations.",
      "Deleting a node with two children requires replacing it with its In-Order Successor (smallest node in right subtree)."
    ],
    commonMistakes: [
      "Assuming a basic BST automatically stays balanced after sequential insertions.",
      "Losing child pointers during node deletion operations.",
      "Confusing Depth-First Traversal (stack/recursion) with Breadth-First Traversal (queue)."
    ],
    quizQuestions: [
      {
        question: "Which traversal of a Binary Search Tree produces elements in strictly ascending sorted order?",
        options: ["Pre-order", "In-order", "Post-order", "Level-order"],
        correct: 1,
        explanation: "In-order traversal visits Left -> Root -> Right, which matches the BST sorting property."
      },
      {
        question: "What is the worst-case search time complexity for a non-balancing BST with N elements?",
        options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
        correct: 2,
        explanation: "If elements are inserted in sorted order, the BST becomes a single skewed line of depth N."
      },
      {
        question: "When deleting a node with TWO children from a BST, which node can replace it to preserve BST properties?",
        options: [
          "The root node",
          "The in-order successor (smallest node in right subtree)",
          "Any random leaf node",
          "The parent of the deleted node"
        ],
        correct: 1,
        explanation: "The in-order successor (or in-order predecessor) guarantees left < node < right remains valid."
      },
      {
        question: "Which data structure is naturally used to implement Level-Order (BFS) tree traversal?",
        options: ["Stack", "Queue", "Priority Queue", "Hash Table"],
        correct: 1,
        explanation: "A FIFO Queue processes nodes level by level in Breadth-First Search order."
      },
      {
        question: "What is the height of a perfectly balanced Binary Search Tree containing N nodes?",
        options: ["N", "N / 2", "O(log2 N)", "N²"],
        correct: 2,
        explanation: "A balanced binary tree halves the node count per level, resulting in a height of log2(N)."
      }
    ]
  },
  {
    id: 'electromagnetism',
    legacyId: 's5',
    topic: "Electromagnetism & Circuit Laws",
    module: "Learning Coach",
    badgeClass: "badge-learning",
    date: "1 week ago",
    estTime: "5 min read",
    summary: [
      "Electromagnetism governs electric charges, currents, and magnetic field interactions.",
      "Kirchhoff's Laws (KCL for current at nodes, KVL for voltage around loops) enable systematic analysis of complex electrical circuits.",
      "Faraday's and Lenz's Laws describe electromagnetic induction, where changing magnetic flux induces electric electromotive force (EMF)."
    ],
    keyConcepts: [
      { title: "Kirchhoff's Junction Rule (KCL)", desc: "Charge conservation: Sum of currents entering a node equals sum leaving." },
      { title: "Kirchhoff's Loop Rule (KVL)", desc: "Energy conservation: Sum of potential differences around closed loop is zero." },
      { title: "Faraday's Law", desc: "Induced EMF = -d(Phi_B)/dt (proportional to rate of magnetic flux change)." },
      { title: "Lenz's Law", desc: "Direction of induced current opposes the flux change that generated it." }
    ],
    importantPoints: [
      "Pay attention to sign conventions when moving clockwise or counterclockwise in KVL loops.",
      "Resistors in Series: R_total = R1 + R2 + ... | Resistors in Parallel: 1/R_total = 1/R1 + 1/R2 + ...",
      "Magnetic Flux Phi_B = B * A * cos(theta), where theta is angle between B field and surface normal vector.",
      "Capacitors store electrical energy in electric fields; Inductors store energy in magnetic fields."
    ],
    commonMistakes: [
      "Assuming current drops across a resistor (current remains constant; potential/voltage drops).",
      "Misidentifying loop traversal direction when writing KVL equations.",
      "Confusing magnetic field magnitude (B) with magnetic flux (Phi_B)."
    ],
    quizQuestions: [
      {
        question: "Kirchhoff's Voltage Law (KVL) is a direct consequence of which fundamental conservation law?",
        options: [
          "Conservation of Charge",
          "Conservation of Energy",
          "Conservation of Momentum",
          "Conservation of Mass"
        ],
        correct: 1,
        explanation: "KVL states net potential drop around any closed loop is zero, representing energy conservation per unit charge."
      },
      {
        question: "According to Lenz's Law, the induced current in a loop will always:",
        options: [
          "Flow in the direction of the magnetic field",
          "Oppose the change in magnetic flux that created it",
          "Double the magnetic field strength",
          "Generate heat energy exclusively"
        ],
        correct: 1,
        explanation: "Lenz's law enforces energy conservation: induced currents create magnetic fields that counteract flux changes."
      },
      {
        question: "Two 10 Ohm resistors are connected in PARALLEL. What is the total equivalent resistance?",
        options: ["20 Ohm", "10 Ohm", "5 Ohm", "1 Ohm"],
        correct: 2,
        explanation: "1 / R_eq = 1/10 + 1/10 = 2/10 => R_eq = 5 Ohms."
      },
      {
        question: "What is the magnetic flux through a surface of area A perpendicular to a uniform magnetic field B?",
        options: ["Zero", "B / A", "B * A", "B² * A"],
        correct: 2,
        explanation: "Phi_B = B * A * cos(0°) = B * A."
      },
      {
        question: "What device operates on Faraday's Law of Electromagnetic Induction to convert mechanical energy into electrical energy?",
        options: ["Electric Motor", "Electric Generator", "Resistor", "Transformer Core"],
        correct: 1,
        explanation: "Generators rotate coils within magnetic fields to produce electrical EMF from mechanical rotation."
      }
    ]
  }
];

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getAuthHeader = () => {
  const token = localStorage.getItem('ilmbot_google_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Recently';
  const now = new Date();

  // Normalize both dates to calendar start of day for exact day difference
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((todayStart - itemDayStart) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── PDF Document source icons ───────────────────────────────────────────────
const FileTextIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const HistoryIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 .49-4.95"></path>
  </svg>
);

export default function SmartRevision({ onNavigate }) {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Source toggle: 'sessions' | 'document'
  const [sourceTab, setSourceTab] = useState('sessions');

  // PDF document picker state
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  // Selected document for doc-source mode (stores { id, filename })
  const [selectedDoc, setSelectedDoc] = useState(null);
  // Whether we are in doc-source material step (no URL param; use local state)
  const [docMaterialStep, setDocMaterialStep] = useState(false);

  // Real conversations / study sessions state
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);

  // Revision pack state
  const [revisionPack, setRevisionPack] = useState(null);
  const [isLoadingPack, setIsLoadingPack] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [errorBanner, setErrorBanner] = useState(null);

  // Flashcards state
  const [flashcards, setFlashcards] = useState([]);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardError, setFlashcardError] = useState(null);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);

  // Derive step state from URL path
  const isQuizRoute = location.pathname.endsWith('/quiz');
  // docMaterialStep drives the material view for doc-source mode
  const step = isQuizRoute ? 'quiz' : (docMaterialStep ? 'material' : (sessionId ? 'material' : 'select'));

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionIdx]: selectedOptionIdx }
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // AI Quiz state
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Real quiz history for analytics & topic mastery
  const [quizHistory, setQuizHistory] = useState([]);
  const [isLoadingQuizHistory, setIsLoadingQuizHistory] = useState(false);

  // Fetch real quiz history for Learning Analytics & Mastery panel (limited to last 5 sessions)
  const fetchQuizHistory = async () => {
    setIsLoadingQuizHistory(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/revision/quiz/history?limit=5`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        setQuizHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch quiz history for analytics:", err);
    } finally {
      setIsLoadingQuizHistory(false);
    }
  };

  // Strictly isolate the 5 most recent quiz sessions for all analytics calculations
  const recent5Sessions = React.useMemo(() => {
    return (quizHistory || []).slice(0, 5);
  }, [quizHistory]);

  // Group quiz sessions pragmatically by conversation topic with average accuracy percentage (last 5 sessions only)
  const topicMastery = React.useMemo(() => {
    if (recent5Sessions.length === 0) return [];

    const topicMap = new Map();

    recent5Sessions.forEach((q) => {
      const rawTitle = q.conversationTitle || q.title?.replace(/\s*Quiz$/i, '') || '';
      const topicName = rawTitle.trim() || (q.coachType === 'coding' ? 'Coding Coach' : 'Learning Coach');

      if (!topicMap.has(topicName)) {
        topicMap.set(topicName, { totalPct: 0, count: 0 });
      }
      const entry = topicMap.get(topicName);
      entry.totalPct += (typeof q.percentage === 'number' ? q.percentage : 0);
      entry.count += 1;
    });

    const palette = ['#39FF14', '#00E5FF', '#B388FF', '#FFD600', '#FF7043', '#00FFA3'];

    return Array.from(topicMap.entries()).map(([topic, data], idx) => {
      const avg = Math.round(data.totalPct / Math.max(1, data.count));
      return {
        topic,
        percent: Math.min(100, Math.max(0, avg)),
        color: palette[idx % palette.length]
      };
    });
  }, [recent5Sessions]);

  // Derive recent revision logs from real quiz history (newest first, limited to last 5 sessions)
  const recentLogs = React.useMemo(() => {
    return recent5Sessions.map((q) => {
      const rawTitle = q.conversationTitle || q.title?.replace(/\s*Quiz$/i, '') || 'Quiz Session';
      const pct = Math.round(typeof q.percentage === 'number' ? q.percentage : 0);
      return {
        id: q.id,
        topic: rawTitle,
        score: `${q.score}/${q.totalQuestions} (${pct}%)`,
        date: formatRelativeTime(q.createdAt)
      };
    });
  }, [recent5Sessions]);

  // Fetch real conversations to populate previous sessions list & quiz history
  useEffect(() => {
    let isMounted = true;
    const fetchRealSessions = async () => {
      setIsLoadingSessions(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/conversations`, {
          headers: getAuthHeader()
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setSessions(data);
        }
      } catch (err) {
        console.error("Failed to fetch study sessions:", err);
      } finally {
        if (isMounted) setIsLoadingSessions(false);
      }
    };

    fetchRealSessions();
    fetchQuizHistory();
    return () => { isMounted = false; };
  }, []);

  // Fetch user documents whenever the PDF Document tab is activated
  useEffect(() => {
    if (sourceTab !== 'document') return;
    let isMounted = true;
    const fetchDocs = async () => {
      setIsLoadingDocs(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/documents`, {
          headers: getAuthHeader()
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setDocuments(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch documents:', err);
      } finally {
        if (isMounted) setIsLoadingDocs(false);
      }
    };
    fetchDocs();
    return () => { isMounted = false; };
  }, [sourceTab]);

  // Sync currentSession, fetch existing revision pack & flashcards when sessionId changes
  useEffect(() => {
    let isMounted = true;
    if (!sessionId) {
      if (!docMaterialStep && !selectedDoc) {
        setCurrentSession(null);
        setRevisionPack(null);
        setFlashcards([]);
        setFlashcardError(null);
      }
      return;
    }

    // Guard doc-mode pseudo session ID so we don't query conversation endpoints with a document ID
    if (selectedDoc && sessionId === selectedDoc.id) {
      return;
    }

    // Check if session details are already in loaded sessions list
    const found = sessions.find((s) => s.id === sessionId);
    if (found) {
      setCurrentSession(found);
    } else {
      fetch(`${apiBaseUrl}/api/conversations/${sessionId}`, {
        headers: getAuthHeader()
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((conv) => {
          if (isMounted && conv) setCurrentSession(conv);
        })
        .catch((err) => console.error("Error loading session detail:", err));
    }

    // Fetch existing revision pack for this session
    setIsLoadingPack(true);
    setErrorBanner(null);
    fetch(`${apiBaseUrl}/api/revision/${sessionId}`, {
      headers: getAuthHeader()
    })
      .then(async (res) => {
        if (res.status === 200) {
          const packData = await res.json();
          if (isMounted) setRevisionPack(packData);
        } else if (res.status === 404) {
          if (isMounted) setRevisionPack(null);
        } else {
          if (isMounted) setErrorBanner("Unable to load revision pack. Please try again.");
        }
      })
      .catch((err) => {
        console.error("Error loading revision pack:", err);
        if (isMounted) setErrorBanner("Unable to load revision pack. Please try again.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingPack(false);
      });

    // Fetch existing flashcards for this session
    setIsLoadingFlashcards(true);
    setFlashcardError(null);
    fetch(`${apiBaseUrl}/api/revision/flashcards/${sessionId}`, {
      headers: getAuthHeader()
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setFlashcards(data.flashcards || []);
        } else if (res.status === 404) {
          if (isMounted) setFlashcards([]);
        }
      })
      .catch((err) => {
        console.error("Error loading flashcards:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingFlashcards(false);
      });

    return () => { isMounted = false; };
  }, [sessionId, sessions]);

  // Reset scroll position to top whenever internal step or session detail changes
  useEffect(() => {
    scrollToTop();
  }, [step, sessionId]);

  // Handle Generate or Regenerate Revision Pack (session-source OR doc-source)
  const handleGeneratePack = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setErrorBanner(null);

    // Doc-source mode
    if (selectedDoc && docMaterialStep) {
      setGenerationStage('Reading PDF Document...');
      const timer = setTimeout(() => setGenerationStage('Generating Revision Material...'), 2400);
      try {
        const res = await fetch(`${apiBaseUrl}/api/revision/document/generate`, {
          method: 'POST',
          headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: selectedDoc.id })
        });
        if (!res.ok) throw new Error(`Generation failed with status ${res.status}`);
        const newPack = await res.json();
        setRevisionPack(newPack);
      } catch (err) {
        console.error('Doc revision pack generation error:', err);
        setErrorBanner('Unable to generate revision pack from document. Please try again.');
      } finally {
        clearTimeout(timer);
        setIsGenerating(false);
        setGenerationStage('');
      }
      return;
    }

    // Session-source mode (existing behavior)
    if (!sessionId) return;
    setGenerationStage("Analyzing Study Session...");
    const timer = setTimeout(() => {
      setGenerationStage("Generating Revision Material...");
    }, 2400);

    try {
      const res = await fetch(`${apiBaseUrl}/api/revision/generate`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });

      if (!res.ok) {
        throw new Error(`Generation failed with status ${res.status}`);
      }

      const newPack = await res.json();
      setRevisionPack(newPack);
    } catch (err) {
      console.error("Revision pack generation error:", err);
      setErrorBanner("Unable to generate revision pack. Please try again.");
    } finally {
      clearTimeout(timer);
      setIsGenerating(false);
      setGenerationStage('');
    }
  };

  // Generate or Regenerate Flashcards (session-source OR doc-source)
  const handleGenerateFlashcards = async () => {
    if (isGeneratingFlashcards) return;
    setIsGeneratingFlashcards(true);
    setFlashcardError(null);

    // Doc-source mode
    if (selectedDoc && docMaterialStep) {
      try {
        const res = await fetch(`${apiBaseUrl}/api/revision/document/flashcards`, {
          method: 'POST',
          headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: selectedDoc.id })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server returned status ${res.status}`);
        }
        const data = await res.json();
        setFlashcards(data.flashcards || []);
      } catch (err) {
        console.error('Failed to generate doc flashcards:', err);
        setFlashcardError(err.message || 'Failed to generate flashcards. Please try again.');
      } finally {
        setIsGeneratingFlashcards(false);
      }
      return;
    }

    // Session-source mode (existing behavior)
    if (!sessionId) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/revision/flashcards`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned status ${res.status}`);
      }

      const data = await res.json();
      setFlashcards(data.flashcards || []);
    } catch (err) {
      console.error("Failed to generate flashcards:", err);
      setFlashcardError(err.message || "Failed to generate flashcards. Please try again.");
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // Active quiz questions: real AI questions or fallback
  const activeQuestions = quizQuestions.length > 0
    ? quizQuestions
    : ((currentSession && currentSession.quizQuestions) || (MOCK_SESSIONS[0] && MOCK_SESSIONS[0].quizQuestions) || []);

  // Fetch AI generated quiz questions from backend (session-source OR doc-source)
  const fetchQuizQuestions = async (targetSessionId, isMounted = true) => {
    if (isLoadingQuiz) return;
    setIsLoadingQuiz(true);
    setQuizError(null);

    // Doc-source mode: generate from document
    if (selectedDoc && docMaterialStep) {
      try {
        const res = await fetch(`${apiBaseUrl}/api/revision/document/quiz`, {
          method: 'POST',
          headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: selectedDoc.id })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Doc Quiz Generation failed (status ${res.status})`);
        }
        const data = await res.json();
        const questions = data.questions || [];
        if (questions.length === 0) throw new Error('No quiz questions were returned.');
        if (isMounted) {
          setQuizQuestions(questions);
          setCurrentQuestionIndex(0);
          setUserAnswers({});
          setQuizSubmitted(false);
          setSubmissionResult(null);
        }
      } catch (err) {
        console.error('Doc quiz generation error:', err);
        if (isMounted) setQuizError(err.message || 'Failed to generate quiz from document.');
      } finally {
        if (isMounted) setIsLoadingQuiz(false);
      }
      return;
    }

    // Check if target is a mock session from static list
    const mockMatch = MOCK_SESSIONS.find((s) => s.id === targetSessionId || s.legacyId === targetSessionId);
    if (mockMatch && mockMatch.quizQuestions) {
      if (isMounted) {
        setQuizQuestions(mockMatch.quizQuestions);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setQuizSubmitted(false);
        setSubmissionResult(null);
        setIsLoadingQuiz(false);
      }
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/revision/quiz`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId: targetSessionId })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `AI Quiz Generation failed (status ${res.status})`);
      }

      const data = await res.json();
      const questions = data.questions || [];
      if (questions.length === 0) {
        throw new Error("No quiz questions were returned by the AI service.");
      }

      if (isMounted) {
        setQuizQuestions(questions);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setQuizSubmitted(false);
        setSubmissionResult(null);
      }
    } catch (err) {
      console.error("Quiz generation error:", err);
      if (isMounted) {
        setQuizError(err.message || "Failed to generate practice quiz. Please try again.");
      }
    } finally {
      if (isMounted) setIsLoadingQuiz(false);
    }
  };

  // Fetch or restore quiz questions on entering quiz route
  useEffect(() => {
    let isMounted = true;
    if (!isQuizRoute) return;

    // Doc-source mode: fetch directly from document
    if (selectedDoc && docMaterialStep) {
      fetchQuizQuestions(null, isMounted);
      return () => { isMounted = false; };
    }

    if (!sessionId) return;

    // Check sessionStorage cache first for this session
    const storageKey = `ilmbot_quiz_${sessionId}`;
    const cached = sessionStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          if (isMounted) {
            setQuizQuestions(parsed.questions);
            setCurrentQuestionIndex(parsed.currentIndex || 0);
            setUserAnswers(parsed.answers || {});
            setQuizSubmitted(Boolean(parsed.submitted));
            setSubmissionResult(parsed.submissionResult || null);
            setIsLoadingQuiz(false);
          }
          return;
        }
      } catch (e) {
        console.warn("Failed to parse cached quiz session:", e);
      }
    }

    fetchQuizQuestions(sessionId, isMounted);

    return () => { isMounted = false; };
  }, [sessionId, isQuizRoute, selectedDoc, docMaterialStep]);

  // Sync quiz progress to sessionStorage for refresh resiliency
  useEffect(() => {
    if (!isQuizRoute || !sessionId || quizQuestions.length === 0) return;
    const storageKey = `ilmbot_quiz_${sessionId}`;
    const payload = {
      questions: quizQuestions,
      currentIndex: currentQuestionIndex,
      answers: userAnswers,
      submitted: quizSubmitted,
      submissionResult
    };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.warn("Error caching quiz state:", e);
    }
  }, [isQuizRoute, sessionId, quizQuestions, currentQuestionIndex, userAnswers, quizSubmitted, submissionResult]);

  // Handle Select Session -> Go to Step 2 (Material) with URL path
  const handleSelectSession = (session) => {
    setSelectedDoc(null);
    setDocMaterialStep(false);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizSubmitted(false);
    navigate(`/smart-revision/${session.id}`);
  };

  // Handle Select Document -> Enter doc-source material step
  const handleSelectDocument = (doc) => {
    setSelectedDoc({ id: doc.id, filename: doc.filename });
    setDocMaterialStep(true);
    setRevisionPack(null);
    setFlashcards([]);
    setFlashcardError(null);
    setErrorBanner(null);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizSubmitted(false);
    setSubmissionResult(null);
    scrollToTop();
  };

  // Handle Back from doc-source material step
  const handleBackFromDocMaterial = () => {
    setDocMaterialStep(false);
    setSelectedDoc(null);
    setRevisionPack(null);
    setFlashcards([]);
    setErrorBanner(null);
  };

  // Handle Start Quiz -> Go to Step 3 (Quiz) with URL path (or local state for doc-mode)
  const handleStartQuiz = () => {
    if (selectedDoc && docMaterialStep) {
      // For doc-source mode we navigate to the quiz sub-route using the document ID as a
      // pseudo session ID so the quiz route activates (but quiz state is driven by selectedDoc)
      navigate(`/smart-revision/${selectedDoc.id}/quiz`);
      return;
    }
    navigate(`/smart-revision/${sessionId}/quiz`);
  };

  // Handle Option Click in Quiz
  const handleOptionSelect = (optionIdx) => {
    if (userAnswers[currentQuestionIndex] !== undefined) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optionIdx
    }));
  };

  // Handle Final Submission of Quiz to Backend
  const handleFinishQuiz = async () => {
    if (isSubmittingQuiz) return;
    setIsSubmittingQuiz(true);
    setQuizError(null);

    const questionsToScore = activeQuestions;
    const formattedAnswers = questionsToScore.map((q, idx) => {
      const selectedOptIdx = userAnswers[idx];
      const isCorrect = selectedOptIdx === q.correct;
      return {
        question: q.question,
        selected_answer: selectedOptIdx !== undefined && q.options[selectedOptIdx] ? q.options[selectedOptIdx] : "",
        correct_answer: q.correctAnswer || (q.options && q.options[q.correct]) || "",
        is_correct: isCorrect
      };
    });

    const isDocQuiz = Boolean((selectedDoc && docMaterialStep) || (selectedDoc && sessionId === selectedDoc.id));
    const isDbSession = !isDocQuiz && Boolean(sessionId && sessionId.length >= 32 && sessionId.includes('-'));

    if (isDbSession) {
      try {
        const res = await fetch(`${apiBaseUrl}/api/revision/quiz/${sessionId}/submit`, {
          method: 'POST',
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ answers: formattedAnswers })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Submission failed with status ${res.status}`);
        }

        const resultData = await res.json();
        setSubmissionResult(resultData);
        setQuizSubmitted(true);
        fetchQuizHistory();
      } catch (err) {
        console.error("Failed to submit quiz results to database:", err);
        setQuizError("Quiz scored, but could not save results to profile history.");
        setQuizSubmitted(true);
      } finally {
        setIsSubmittingQuiz(false);
      }
    } else {
      // Document-source or mock quiz: score locally without hitting conversation DB endpoint
      const incorrectQuestions = formattedAnswers.filter(a => !a.is_correct);
      const weakAreas = [...new Set(incorrectQuestions.map(a => a.question.split(' ').slice(0, 5).join(' ') + '...'))].slice(0, 3);
      setSubmissionResult({
        score: formattedAnswers.filter(a => a.is_correct).length,
        total: formattedAnswers.length,
        weakAreas: weakAreas.length > 0 ? weakAreas : null
      });
      setQuizSubmitted(true);
      setIsSubmittingQuiz(false);
    }
  };

  // Navigation inside Quiz
  const handleNextQuestion = () => {
    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleFinishQuiz();
    }
  };

  // Calculate Quiz Score
  const calculateScore = () => {
    if (submissionResult && typeof submissionResult.score === 'number') {
      return submissionResult.score;
    }
    let correctCount = 0;
    activeQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct) {
        correctCount++;
      }
    });
    return correctCount;
  };

  // Restart / Retake Quiz
  const handleRetakeQuiz = () => {
    if (sessionId) {
      sessionStorage.removeItem(`ilmbot_quiz_${sessionId}`);
    }
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizSubmitted(false);
    setSubmissionResult(null);
    setQuizError(null);
    if (selectedDoc && docMaterialStep) {
      fetchQuizQuestions(null);
    } else if (sessionId) {
      fetchQuizQuestions(sessionId);
    }
  };

  // Doc-source derived values
  const isDocMode = Boolean(selectedDoc && docMaterialStep);
  const isCoding = !isDocMode && currentSession?.coach_type === 'coding';
  const sessionModule = isDocMode ? 'PDF Document' : (isCoding ? 'Coding Coach' : 'Learning Coach');
  const badgeClass = isDocMode ? 'badge-document' : (isCoding ? 'badge-coding' : 'badge-learning');
  const sessionTopic = isDocMode ? (selectedDoc?.filename || 'PDF Document') : (currentSession?.title || 'Study Session');

  return (
    <div className="smart-revision-container">
      <div className="smart-revision-main">
        {/* ================= STEP 1: SESSION SELECTION ================= */}
        {step === 'select' && (
          <div className="step-select-wrapper">
            {/* Learning Analytics Banner Section */}
            <React.Suspense fallback={null}>
              <AnalyticsMasteryPanel
                topicMastery={topicMastery}
                recentLogs={recentLogs}
                isLoadingQuizHistory={isLoadingQuizHistory}
              />
            </React.Suspense>

            {/* ── SOURCE TOGGLE TABS ── */}
            <div className="source-toggle-row">
              <button
                className={`source-toggle-btn${sourceTab === 'sessions' ? ' active' : ''}`}
                onClick={() => setSourceTab('sessions')}
              >
                <HistoryIcon />
                <span>Previous Sessions</span>
              </button>
              <button
                className={`source-toggle-btn${sourceTab === 'document' ? ' active' : ''}`}
                onClick={() => setSourceTab('document')}
              >
                <FileTextIcon />
                <span>PDF Document</span>
              </button>
            </div>

            {/* ── PREVIOUS SESSIONS TAB ── */}
            {sourceTab === 'sessions' && (
              <>
                <div className="section-header-row">
                  <div>
                    <h2 className="section-title">Previous Learning Sessions</h2>
                    <p className="section-subtitle">Select a session below to generate AI revision material &amp; attempt a practice quiz</p>
                  </div>
                  <span className="session-count-chip">{sessions.length} Sessions Available</span>
                </div>

                {isLoadingSessions ? (
                  <div className="sessions-grid">
                    <div className="glass-panel session-card" style={{ opacity: 0.6 }}>
                      <p style={{ color: 'var(--text-muted)' }}>Loading previous study sessions...</p>
                    </div>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="empty-sessions-notice">
                    <h3>No Study Sessions Found</h3>
                    <p>Start a conversation in Learning Coach or Coding Coach to generate personalized AI revision material.</p>
                  </div>
                ) : (
                  <div className="sessions-grid">
                    {sessions.map((session) => {
                      const isSessionCoding = session.coach_type === 'coding';
                      const sModule = isSessionCoding ? 'Coding Coach' : 'Learning Coach';
                      const sBadge = isSessionCoding ? 'badge-coding' : 'badge-learning';
                      const sDate = formatRelativeTime(session.updated_at || session.created_at);

                      return (
                        <div
                          key={session.id}
                          className="glass-panel session-card"
                          onClick={() => handleSelectSession(session)}
                        >
                          <div className="session-card-top">
                            <span className={`module-badge ${sBadge}`}>{sModule}</span>
                            <span className="session-date">{sDate}</span>
                          </div>
                          <h3 className="session-title">{session.title}</h3>
                          <p className="session-meta">
                            <BookOpenIcon /> Study Session &bull; Exam-Ready AI Revision
                          </p>
                          <div className="session-card-bottom">
                            <span className="revised-count">Ready for review</span>
                            <button className="revise-btn">
                              <span>Revise Now</span>
                              <span className="btn-arrow-icon"><ArrowRightIcon size={18} /></span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── PDF DOCUMENT TAB ── */}
            {sourceTab === 'document' && (
              <div className="doc-picker-section">
                <div className="doc-picker-header">
                  <div>
                    <h2>PDF Documents</h2>
                    <p>Select an uploaded PDF to generate revision material grounded in its content</p>
                  </div>
                  {documents.length > 0 && (
                    <span className="doc-count-chip">{documents.length} Document{documents.length !== 1 ? 's' : ''}</span>
                  )}
                </div>

                {isLoadingDocs ? (
                  <div className="doc-picker-grid">
                    <div className="doc-card" style={{ opacity: 0.6 }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading documents...</p>
                    </div>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="empty-docs-notice">
                    <FileTextIcon />
                    <h3>No Documents Uploaded</h3>
                    <p>Upload a PDF in Learning Coach or Coding Coach using the paperclip attachment menu, then come back here to revise from it.</p>
                  </div>
                ) : (
                  <div className="doc-picker-grid">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="doc-card"
                        onClick={() => handleSelectDocument(doc)}
                      >
                        <div className="doc-card-top">
                          <span className="doc-pdf-badge">📄 PDF</span>
                          <span className="doc-card-date">{formatRelativeTime(doc.uploaded_at)}</span>
                        </div>
                        <div className="doc-card-filename">{doc.filename}</div>
                        <div className="doc-card-bottom">
                          <span className="doc-chunk-chip">{doc.chunk_count ?? '—'} chunks</span>
                          <button className="revise-from-doc-btn" onClick={(e) => { e.stopPropagation(); handleSelectDocument(doc); }}>
                            <span>Revise</span>
                            <ArrowRightIcon size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 2: REVISION MATERIAL ================= */}
        {step === 'material' && (
          <div className={`step-material-wrapper ${isCoding ? 'coding-theme' : ''}`}>
            {/* Header with Back Affordance & Title */}
            <div className="material-header">
              <button className="back-btn" onClick={isDocMode ? handleBackFromDocMaterial : () => navigate('/smart-revision')}>
                <ArrowLeftIcon />
                <span>{isDocMode ? 'Back to Documents' : 'Back to Sessions'}</span>
              </button>

              <div className="material-header-row">
                <div className="material-title-group">
                  <span className={`module-badge ${badgeClass}`}>
                    {sessionModule}
                  </span>
                  <h1 className="material-topic-title">{sessionTopic}</h1>
                </div>

                {revisionPack && !isGenerating && (
                  <button
                    className="regenerate-btn"
                    onClick={handleGeneratePack}
                    disabled={isGenerating}
                    title="Generate a fresh revision pack"
                  >
                    <RefreshCwIcon />
                    <span>Regenerate Revision Pack</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error Banner */}
            {errorBanner && (
              <div className="revision-error-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangleIcon />
                  <span>{errorBanner}</span>
                </div>
                <button onClick={() => setErrorBanner(null)} className="error-close-btn" aria-label="Dismiss error">&times;</button>
              </div>
            )}

            {/* Active Generation Loading State */}
            {isGenerating ? (
              <div className="glass-panel revision-generating-state">
                <div className="revision-spinner"></div>
                <h3 className="generating-title">{generationStage || 'Analyzing Study Session...'}</h3>
                <p className="generating-subtitle">Synthesizing conversation history, key concepts, and exam takeaways via AI...</p>
              </div>
            ) : isLoadingPack ? (
              <div className="glass-panel revision-generating-state" style={{ padding: '48px 24px' }}>
                <div className="revision-spinner"></div>
                <p className="generating-subtitle">Checking for existing revision material...</p>
              </div>
            ) : !revisionPack ? (
              /* No Pack Yet -> Call To Action State */
              <div className="glass-panel revision-empty-cta">
                <div className="empty-cta-icon-wrapper">
                  <SparklesIcon />
                </div>
                <h2 className="empty-cta-title">Ready to Revise This Session?</h2>
                <p className="empty-cta-desc">
                  Generate an AI-powered revision pack tailored to your conversation. Includes an exam-focused summary, core concept extractions, high-yield takeaways, and common pitfalls to avoid.
                </p>
                <button
                  className="primary-action-btn generate-cta-btn"
                  onClick={handleGeneratePack}
                >
                  <SparklesIcon />
                  <span>Generate Revision Pack</span>
                </button>
              </div>
            ) : (
              /* 4 Real Content Sections */
              <>
                <div className="sections-container">
                  {/* Section 1: AI Summary */}
                  <div className="glass-panel material-card">
                    <div className="card-header-row">
                      <div className="header-icon-title">
                        <SparklesIcon />
                        <h3>AI-Generated Summary</h3>
                      </div>
                      <span className="section-tag">Overview</span>
                    </div>
                    <div className="material-card-body summary-body">
                      {revisionPack.summary.split('\n\n').filter(Boolean).map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Key Concepts */}
                  <div className="glass-panel material-card">
                    <div className="card-header-row">
                      <div className="header-icon-title">
                        <KeyIcon />
                        <h3>Key Concepts Extraction</h3>
                      </div>
                      <span className="section-tag">{revisionPack.keyConcepts.length} Core Concepts</span>
                    </div>
                    <div className="material-card-body">
                      <div className="key-concepts-grid">
                        {revisionPack.keyConcepts.map((concept, idx) => {
                          const title = typeof concept === 'string' ? concept : (concept.title || JSON.stringify(concept));
                          const desc = typeof concept === 'object' && concept.desc ? concept.desc : null;
                          return (
                            <div key={idx} className="concept-item">
                              <span className="concept-title">{title}</span>
                              {desc && <p className="concept-desc">{desc}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Important Points */}
                  <div className="glass-panel material-card">
                    <div className="card-header-row">
                      <div className="header-icon-title">
                        <CheckCircleIcon />
                        <h3>Important Takeaways & Rules</h3>
                      </div>
                      <span className="section-tag">Principles & Rules</span>
                    </div>
                    <div className="material-card-body">
                      <ul className="bullet-list">
                        {revisionPack.importantPoints.map((point, idx) => (
                          <li key={idx}>
                            <span className="bullet-dot"></span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Section 4: Common Mistakes */}
                  <div className="glass-panel material-card warning-theme">
                    <div className="card-header-row">
                      <div className="header-icon-title">
                        <AlertTriangleIcon />
                        <h3>Common Pitfalls & Mistakes</h3>
                      </div>
                      <span className="section-tag warning-tag">Avoid These</span>
                    </div>
                    <div className="material-card-body">
                      <ul className="bullet-list warning-bullets">
                        {revisionPack.commonMistakes.map((mistake, idx) => (
                          <li key={idx}>
                            <span className="warning-dot">!</span>
                            <span>{mistake}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Section 5: Dedicated Study Flashcards */}
                <section className="glass-panel revision-flashcards-section">
                  <div className="card-header-row">
                    <div className="header-icon-title">
                      <CardsIcon />
                      <h3>Study Flashcards</h3>
                    </div>
                    {flashcards.length > 0 && (
                      <span className="section-tag flashcards-badge">
                        {flashcards.length} Flashcards
                      </span>
                    )}
                  </div>

                  <div className="flashcards-section-body">
                    {/* Inline Error Alert */}
                    {flashcardError && (
                      <div className="flashcards-inline-error">
                        <span>{flashcardError}</span>
                        <button
                          className="retry-inline-btn"
                          onClick={handleGenerateFlashcards}
                          disabled={isGeneratingFlashcards}
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {/* Generating State */}
                    {isGeneratingFlashcards ? (
                      <div className="flashcards-loading-state">
                        <div className="revision-spinner small"></div>
                        <div className="loading-text-group">
                          <h4>Generating Flashcards...</h4>
                          <p>Extracting high-yield recall question & answer pairs from this session...</p>
                        </div>
                      </div>
                    ) : isLoadingFlashcards ? (
                      <div className="flashcards-loading-state">
                        <div className="revision-spinner small"></div>
                        <p>Checking for saved flashcards...</p>
                      </div>
                    ) : flashcards.length === 0 ? (
                      /* Not Generated Yet State */
                      <div className="flashcards-empty-box">
                        <p className="flashcards-prompt-text">
                          Test your active recall with AI-generated 3D flashcards created specifically from this session's core concepts and takeaways.
                        </p>
                        <button
                          className="primary-action-btn generate-flashcards-btn"
                          onClick={handleGenerateFlashcards}
                        >
                          <CardsIcon />
                          <span>Generate Flashcards</span>
                        </button>
                      </div>
                    ) : (
                      /* Deck Ready State */
                      <div className="flashcards-ready-box">
                        <div className="flashcards-info-col">
                          <p className="flashcards-ready-text">
                            Your personalized study deck is ready. Practice with 3D flip cards to reinforce long-term memory.
                          </p>
                          <span className="deck-meta-chip">
                            {flashcards.length} Question & Answer Cards Ready
                          </span>
                        </div>
                        <div className="flashcards-actions-row">
                          <button
                            className="primary-action-btn open-deck-btn"
                            onClick={() => setShowFlashcardModal(true)}
                          >
                            <CardsIcon />
                            <span>Open Flashcards Deck</span>
                          </button>
                          <button
                            className="regenerate-flashcards-btn"
                            onClick={handleGenerateFlashcards}
                            disabled={isGeneratingFlashcards}
                            title="Regenerate a fresh flashcard deck"
                          >
                            <RefreshCwIcon />
                            <span>Generate New Deck</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Bottom Action Footer */}
                <div className="material-footer-cta">
                  <button className="primary-action-btn" onClick={handleStartQuiz}>
                    <span>Attempt Practice Quiz</span>
                    <ArrowRightIcon />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= STEP 3: QUIZ & RESULTS ================= */}
        {step === 'quiz' && (
          <div className="step-quiz-wrapper">
            {isLoadingQuiz ? (
              /* QUIZ GENERATION LOADING STATE */
              <div className="quiz-active-container">
                <div className="glass-panel quiz-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px', gap: '18px', textAlign: 'center' }}>
                  <div className="revision-spinner"></div>
                  <div>
                    <h3 style={{ color: '#FFFFFF', fontSize: '18px', margin: '0 0 6px 0', fontFamily: 'var(--font-heading)' }}>Generating Practice Quiz with AI...</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Crafting high-yield multiple-choice questions from your study session notes...</p>
                  </div>
                </div>
              </div>
            ) : isSubmittingQuiz ? (
              /* QUIZ SUBMISSION LOADING STATE */
              <div className="quiz-active-container">
                <div className="glass-panel quiz-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px', gap: '18px', textAlign: 'center' }}>
                  <div className="revision-spinner"></div>
                  <div>
                    <h3 style={{ color: '#FFFFFF', fontSize: '18px', margin: '0 0 6px 0', fontFamily: 'var(--font-heading)' }}>Evaluating Diagnostic Performance...</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Analyzing weak areas and persisting results to your profile history...</p>
                  </div>
                </div>
              </div>
            ) : (
              <React.Suspense fallback={
                <div className="quiz-active-container">
                  <div className="glass-panel quiz-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px', textAlign: 'center' }}>
                    <div className="revision-spinner"></div>
                    <p style={{ color: 'var(--text-muted)' }}>Loading Quiz Module...</p>
                  </div>
                </div>
              }>
                <QuizModule
                  sessionId={sessionId}
                  activeQuestions={activeQuestions}
                  currentQuestionIndex={currentQuestionIndex}
                  userAnswers={userAnswers}
                  quizSubmitted={quizSubmitted}
                  quizError={quizError}
                  submissionResult={submissionResult}
                  handleOptionSelect={handleOptionSelect}
                  handleNextQuestion={handleNextQuestion}
                  handleRetakeQuiz={handleRetakeQuiz}
                  fetchQuizQuestions={fetchQuizQuestions}
                  navigate={navigate}
                  calculateScore={calculateScore}
                  onExitQuiz={() => {
                    if (selectedDoc) {
                      setDocMaterialStep(true);
                      navigate('/smart-revision');
                    } else {
                      navigate(`/smart-revision/${sessionId}`);
                    }
                  }}
                />
              </React.Suspense>
            )}
          </div>
        )}
      </div>

      {/* 3D Study Flashcards Modal Overlay */}
      {showFlashcardModal && (
        <React.Suspense fallback={null}>
          <FlashcardModal
            isOpen={showFlashcardModal}
            onClose={() => setShowFlashcardModal(false)}
            cards={flashcards}
            theme={isCoding ? 'coding' : 'learning'}
            title={`${sessionTopic} Flashcards`}
          />
        </React.Suspense>
      )}
    </div>
  );
}
