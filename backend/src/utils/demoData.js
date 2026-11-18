const Job = require('../models/Job');
const Resume = require('../models/Resume');
const CandidateEvaluation = require('../models/CandidateEvaluation');
const { matchResume } = require('../services/aiServiceClient');

const DEMO_JOB_TITLES = [
  'Senior Full-Stack Engineer',
  'Senior Machine Learning Engineer',
  'Frontend React Engineer',
];

const seedCandidatesForJob = async (userId, job, candidates, thresholdToUse) => {
  for (const cand of candidates) {
    const resume = await Resume.create({
      ownerId: userId,
      jobId: job._id,
      originalFileName: `${cand.name.replace(/\s+/g, '_')}_Resume.pdf`,
      storedFileName: `demo-${Date.now()}-${Math.floor(Math.random() * 10000)}-${cand.name.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      filePath: 'demo_file_virtual',
      fileSize: 124500,
      mimeType: 'application/pdf',
      extractedText: cand.text,
      candidateDetails: {
        name: cand.name,
        email: cand.email,
        phone: cand.phone,
        skills: cand.skills,
        education: cand.quals,
        yearsOfExperience: cand.years,
        experienceSnippets: [`${cand.years} years of professional experience across modern engineering technologies.`],
        evidence: cand.evidence || {
          'React.js': 'Built reusable UI component libraries with React.js',
          'Node.js': 'Engineered scalable microservices with Node.js and MongoDB',
          'JavaScript': 'Deeply familiar with modern JavaScript and full-stack web applications',
          'MongoDB': 'Maintained high availability MongoDB database clusters',
          'REST APIs': 'Developed and documented RESTful APIs consumed by mobile and web clients',
        },
      },
      extractedSkills: cand.skills,
      processingStatus: 'Completed',
    });

    let evalResult = null;
    try {
      evalResult = await matchResume(
        {
          extractedText: resume.extractedText,
          skills: resume.candidateDetails.skills,
          yearsOfExperience: resume.candidateDetails.yearsOfExperience,
          education: resume.candidateDetails.education,
          name: resume.candidateDetails.name,
          evidence: resume.candidateDetails.evidence,
        },
        {
          title: job.title,
          description: job.description,
          requiredSkills: job.requiredSkills,
          preferredSkills: job.preferredSkills,
          minimumExperience: job.minimumExperience,
          qualifications: job.qualifications,
          shortlistThreshold: thresholdToUse,
        },
        job.scoringConfiguration?.weights
      );
    } catch (evalErr) {
      evalResult = cand.fallbackEval;
    }

    if (!evalResult) {
      evalResult = cand.fallbackEval;
    }

    const isShortlisted = evalResult.overallScore >= thresholdToUse;
    const reviewStatus = isShortlisted ? 'Shortlisted' : 'Awaiting Review';
    const recruiterNotes = isShortlisted
      ? `Auto-shortlisted: candidate match score (${evalResult.overallScore}%) meets or exceeds the ${thresholdToUse}% recruiter shortlist threshold. Strong technical stack alignment.`
      : `Not shortlisted: candidate match score (${evalResult.overallScore}%) is below the ${thresholdToUse}% shortlist threshold. Review pending.`;

    await CandidateEvaluation.create({
      ownerId: userId,
      jobId: job._id,
      resumeId: resume._id,
      candidateName: cand.name,
      overallScore: evalResult.overallScore,
      componentScores: evalResult.componentScores,
      weightsUsed: evalResult.weights,
      matchingSkills: evalResult.matchingSkills,
      missingRequiredSkills: evalResult.missingRequiredSkills,
      missingPreferredSkills: evalResult.missingPreferredSkills,
      additionalSkills: evalResult.additionalSkills,
      evidence: evalResult.evidence,
      recommendation: evalResult.recommendation,
      explanation: evalResult.explanation,
      reviewStatus,
      recruiterNotes,
      evaluatedAt: new Date(),
    });
  }

  const evaluations = await CandidateEvaluation.find({ jobId: job._id }).sort({ overallScore: -1 });
  for (let i = 0; i < evaluations.length; i++) {
    evaluations[i].rank = i + 1;
    await evaluations[i].save();
  }
  return evaluations;
};

const seedDemoDataForUser = async (userId, options = {}) => {
  const { force = false, shortlistThreshold = 80 } = options;

  // Check if user already has the demo jobs
  const existingJobs = await Job.find({ ownerId: userId });
  const hasDemoJob = existingJobs.some((j) => DEMO_JOB_TITLES.includes(j.title));

  if (hasDemoJob && !force) {
    // If demo job already exists, check if it has candidates
    const demoJob = existingJobs.find((j) => j.title === 'Senior Full-Stack Engineer');
    const existingCandidatesCount = demoJob ? await CandidateEvaluation.countDocuments({ jobId: demoJob._id }) : 0;

    if (existingCandidatesCount > 0) {
      // Sync evaluations to enforce the threshold
      const evaluations = await CandidateEvaluation.find({ ownerId: userId });
      for (const ev of evaluations) {
        const targetJob = existingJobs.find((j) => j._id.toString() === ev.jobId.toString());
        const thresh = targetJob?.shortlistThreshold ?? (Number(shortlistThreshold) || 80);
        if (ev.overallScore < thresh && ev.reviewStatus === 'Shortlisted') {
          ev.reviewStatus = 'Awaiting Review';
          ev.recruiterNotes = `Shortlist status adjusted: Match score (${ev.overallScore}%) is below the ${thresh}% shortlist threshold.`;
          await ev.save();
        } else if (ev.overallScore >= thresh && ev.reviewStatus === 'Awaiting Review') {
          ev.reviewStatus = 'Shortlisted';
          ev.recruiterNotes = `Auto-shortlisted: Match score (${ev.overallScore}%) meets or exceeds the ${thresh}% shortlist threshold.`;
          await ev.save();
        }
      }
      return {
        success: true,
        message: `Sample demo candidates already present and synchronized with ${shortlistThreshold}% shortlist threshold.`,
      };
    }
  }

  if (force && existingJobs.length > 0) {
    // Clean up existing demo jobs specifically
    const demoJobIds = existingJobs.filter((j) => DEMO_JOB_TITLES.includes(j.title)).map((j) => j._id);
    if (demoJobIds.length > 0) {
      await CandidateEvaluation.deleteMany({ jobId: { $in: demoJobIds } });
      await Resume.deleteMany({ jobId: { $in: demoJobIds } });
      await Job.deleteMany({ _id: { $in: demoJobIds } });
    }
  }

  const thresholdToUse = Number(shortlistThreshold) || 80;

  // 1. Create Senior Full-Stack Engineer Job
  const fullstackJob = await Job.create({
    ownerId: userId,
    title: 'Senior Full-Stack Engineer',
    company: 'TechFlow Cloud Solutions',
    department: 'Core Platform Engineering',
    description: `We are seeking an experienced Senior Full-Stack Engineer to lead development of our distributed cloud web platform. 
You will architect scalable microservices, create responsive web applications, and collaborate across engineering and product teams.
Responsibilities include writing clean code, reviewing pull requests, mentoring juniors, and optimizing system performance.`,
    requiredSkills: ['React.js', 'Node.js', 'JavaScript', 'MongoDB', 'REST APIs'],
    preferredSkills: ['Docker', 'TypeScript', 'Kubernetes', 'AWS', 'GraphQL'],
    qualifications: ["Bachelor's Degree", "Master's Degree", "Bachelor of Technology (B.Tech)"],
    minimumExperience: 3,
    preferredExperience: 5,
    employmentType: 'Full-time',
    location: 'Remote (US/Global)',
    status: 'Active',
    shortlistThreshold: thresholdToUse,
    scoringConfiguration: {
      weights: {
        requiredSkills: 40,
        preferredSkills: 20,
        textSimilarity: 25,
        experience: 10,
        qualification: 5,
      },
    },
  });

  // 2. Create Machine Learning & Data Scientist Job
  const aiJob = await Job.create({
    ownerId: userId,
    title: 'Senior Machine Learning Engineer',
    company: 'TechFlow Cloud Solutions',
    department: 'Artificial Intelligence & Data',
    description: `Join our AI Core team building next-generation NLP and predictive models.
You will train, evaluate, and deploy deep learning and classical machine learning models into high-throughput production pipelines.
Strong background in Python, PyTorch/TensorFlow, scikit-learn, and vector embeddings required.`,
    requiredSkills: ['Python', 'Machine Learning', 'scikit-learn', 'TensorFlow', 'Natural Language Processing (NLP)'],
    preferredSkills: ['Docker', 'PyTorch', 'FastAPI', 'Pandas', 'Apache Kafka'],
    qualifications: ["Master's Degree", "Ph.D. / Doctorate", "Master of Science (M.S.)"],
    minimumExperience: 4,
    preferredExperience: 6,
    employmentType: 'Full-time',
    location: 'San Francisco, CA (Hybrid)',
    status: 'Active',
    shortlistThreshold: thresholdToUse,
  });

  // 3. Create Frontend React Engineer Job
  const frontendJob = await Job.create({
    ownerId: userId,
    title: 'Frontend React Engineer',
    company: 'TechFlow Cloud Solutions',
    department: 'Product Design & UI Engineering',
    description: `We are looking for a skilled Frontend React Engineer to build fast, accessible, and visually polished SaaS web applications.
You will work closely with designers and backend engineers using React.js, TypeScript, CSS3, REST APIs, and modern state management.`,
    requiredSkills: ['React.js', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3'],
    preferredSkills: ['Next.js', 'Tailwind CSS', 'Redux', 'Jest', 'GraphQL'],
    qualifications: ["Bachelor's Degree", "Bachelor of Technology (B.Tech)"],
    minimumExperience: 2,
    preferredExperience: 4,
    employmentType: 'Full-time',
    location: 'New York, NY (Hybrid)',
    status: 'Active',
    shortlistThreshold: thresholdToUse,
  });

  // 4. Create Sample Candidates for Senior Full-Stack Engineer
  const sampleCandidates = [
    {
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      phone: '+1 (555) 234-5678',
      text: `Rahul Sharma - Senior Full Stack Software Developer
Email: rahul.sharma@example.com | Phone: +1 (555) 234-5678 | San Francisco, CA
Summary:
Enthusiastic full stack developer with 5 years of experience architecting cloud web applications using React.js, Node.js, Express.js, and MongoDB. Proven track record deploying microservices and containerized applications with Docker.
Technical Skills:
JavaScript, TypeScript, React.js, Next.js, Node.js, Express.js, MongoDB, REST APIs, GraphQL, Docker, Git, CI/CD, HTML5, CSS3, Redux.
Experience:
Senior Software Engineer at NexaCorp (2021 - Present)
- Engineered scalable microservices with Node.js and MongoDB serving 2M daily requests.
- Built reusable UI component libraries with React.js and TypeScript.
Full Stack Developer at CloudBase (2019 - 2021)
- Developed RESTful APIs and modern web dashboards using React.js and Express.js.
Education:
Bachelor of Technology (B.Tech) in Computer Science, State Institute of Technology (2015 - 2019)`,
      skills: ['React.js', 'Node.js', 'JavaScript', 'TypeScript', 'MongoDB', 'REST APIs', 'Docker', 'GraphQL', 'Express.js', 'HTML5', 'CSS3', 'Git'],
      years: 5.0,
      quals: [{ degree: 'Bachelor of Technology (B.Tech)', rawText: 'Bachelor of Technology (B.Tech) in Computer Science (2019)', year: '2019' }],
      fallbackEval: {
        overallScore: 89.2,
        componentScores: { requiredSkills: 100, preferredSkills: 60, textSimilarity: 84.5, experience: 98, qualification: 100 },
        weights: { requiredSkills: 40, preferredSkills: 20, textSimilarity: 25, experience: 10, qualification: 5 },
        matchingSkills: ['React.js', 'Node.js', 'JavaScript', 'MongoDB', 'REST APIs', 'Docker', 'GraphQL', 'TypeScript'],
        missingRequiredSkills: [],
        missingPreferredSkills: ['Kubernetes', 'AWS'],
        additionalSkills: ['Express.js', 'HTML5', 'CSS3', 'Git'],
        recommendation: `Strong match (≥ ${thresholdToUse}%). Fully eligible for shortlisting and interview scheduling.`,
        explanation: 'Matched 5/5 required skills. All required skills present. 5 years experience meets criteria (5 yrs >= 3 yrs required). Overall candidate relevance index: 89.2/100.',
      },
    },
    {
      name: 'Gaddam Praveen Reddy',
      email: 'gaddampraveen456@gmail.com',
      phone: '+91 7989786981',
      text: `GADDAM PRAVEEN REDDY - Full-Stack Developer & Software Engineer
Hyderabad, Telangana | gaddampraveen456@gmail.com | +91 7989786981 | LinkedIn: linkedin.com/in/gaddampraveen12 | GitHub: github.com/gaddampraveen-07
Career Objective:
Aspiring Computer Science graduate eager to contribute to innovative tech projects through strong problem solving, programming, and communication skills.
Technical Skills:
Java, JavaScript, React.js, Node.js, Express.js, MongoDB, HTML5, CSS3, REST APIs, Git, GitHub, MySQL, SQL, Natural Language Processing (NLP).
Projects:
• AI-powered Resume Ranker: Built end-to-end resume screening and ranking platform using React.js, Node.js, Express.js, MongoDB, and NLP techniques.
• Travel Itinerary Generator: Full-stack itinerary generator using React.js, Node.js, Express.js, and MongoDB.
• Music Streaming Website: Responsive web application built with HTML, CSS, JavaScript.
Academic Qualifications:
2022 – 2026 Bachelor of Technology in CSE, Malla Reddy Institute of Technology and Science, CGPA: 7.4/10`,
      skills: ['React.js', 'Node.js', 'JavaScript', 'MongoDB', 'Express.js', 'REST APIs', 'Java', 'HTML5', 'CSS3', 'Git', 'SQL', 'MySQL', 'Natural Language Processing (NLP)'],
      years: 0,
      quals: [{ degree: 'Bachelor of Technology (B.Tech)', rawText: 'Bachelor of Technology in CSE (2022 – 2026)', year: '2026' }],
      fallbackEval: {
        overallScore: 84.5,
        componentScores: { requiredSkills: 100, preferredSkills: 70, textSimilarity: 82.5, experience: 80, qualification: 95 },
        weights: { requiredSkills: 40, preferredSkills: 20, textSimilarity: 25, experience: 10, qualification: 5 },
        matchingSkills: ['React.js', 'Node.js', 'JavaScript', 'MongoDB', 'REST APIs', 'Git', 'SQL'],
        missingRequiredSkills: [],
        missingPreferredSkills: ['Docker', 'AWS', 'Kubernetes'],
        additionalSkills: ['Express.js', 'Java', 'HTML5', 'CSS3', 'MySQL', 'Natural Language Processing (NLP)'],
        recommendation: `Strong match (≥ ${thresholdToUse}%). Meets required technical skills and qualifies for shortlisting.`,
        explanation: 'Matched 5/5 required skills. Built AI-powered Resume Ranker and Full-Stack web applications. Meets graduate qualification criteria. Score: 84.5/100.',
      },
    },
    {
      name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      phone: '+1 (555) 890-1234',
      text: `Elena Rostova - Full Stack Engineer
Email: elena.rostova@example.com | Seattle, WA
Summary:
Passionate Software Engineer with 3.5 years experience building web applications. Deeply familiar with modern JavaScript, React.js, Node.js, and REST APIs. Basic familiarity with containerization.
Skills:
JavaScript, React.js, Node.js, REST APIs, HTML5, CSS3, Tailwind CSS, PostgreSQL, Git, Agile, Jest.
Experience:
Software Engineer at InnovateTech (2022 - Present)
- Developed responsive customer facing features in React.js and integrated with Node.js REST APIs.
Junior Developer at DevStudio (2020 - 2022)
- Collaborated on front-end components and maintained API endpoints.
Education:
Bachelor of Science (B.S.) in Software Engineering, University of Washington (2020)`,
      skills: ['React.js', 'Node.js', 'JavaScript', 'REST APIs', 'PostgreSQL', 'HTML5', 'CSS3', 'Tailwind CSS', 'Git', 'Jest'],
      years: 3.5,
      quals: [{ degree: "Bachelor's Degree", rawText: 'Bachelor of Science (B.S.) in Software Engineering (2020)', year: '2020' }],
      fallbackEval: {
        overallScore: 72.4,
        componentScores: { requiredSkills: 80, preferredSkills: 0, textSimilarity: 68.2, experience: 91, qualification: 90 },
        weights: { requiredSkills: 40, preferredSkills: 20, textSimilarity: 25, experience: 10, qualification: 5 },
        matchingSkills: ['React.js', 'Node.js', 'JavaScript', 'REST APIs'],
        missingRequiredSkills: ['MongoDB'],
        missingPreferredSkills: ['Docker', 'TypeScript', 'Kubernetes', 'AWS', 'GraphQL'],
        additionalSkills: ['PostgreSQL', 'HTML5', 'CSS3', 'Tailwind CSS', 'Git', 'Jest'],
        recommendation: `Moderate match (< ${thresholdToUse}%). Candidate meets core criteria but falls below the ${thresholdToUse}% shortlisting threshold.`,
        explanation: 'Matched 4/5 required skills. Missing required: MongoDB. Experience meets 3.5 yrs criteria. Overall candidate relevance index: 72.4/100.',
      },
    },
    {
      name: 'Marcus Chen',
      email: 'marcus.chen@example.com',
      phone: '+1 (555) 456-7890',
      text: `Marcus Chen - Senior DevOps & Backend Architect
Email: marcus.chen@example.com | Austin, TX
Summary:
DevOps and Backend specialist with 7 years experience in Kubernetes, Docker, AWS, and Golang. Passionate about distributed systems and infrastructure automation.
Technical Skills:
Docker, Kubernetes, AWS, Go, Python, Terraform, CI/CD, Linux, PostgreSQL, Microservices.
Experience:
Senior DevOps Engineer at InfraScale (2019 - Present)
- Managed production Kubernetes clusters across multi-region AWS environments.
Backend Engineer at NetGrid (2017 - 2019)
- Designed microservices in Go and Python.
Education:
Master of Science (M.S.) in Computer Systems, UT Austin (2017)`,
      skills: ['Docker', 'Kubernetes', 'Amazon Web Services (AWS)', 'Go', 'Python', 'Terraform', 'CI/CD', 'Linux', 'Microservices'],
      years: 7.0,
      quals: [{ degree: "Master's Degree", rawText: 'Master of Science (M.S.) in Computer Systems (2017)', year: '2017' }],
      fallbackEval: {
        overallScore: 47.1,
        componentScores: { requiredSkills: 0, preferredSkills: 60, textSimilarity: 43.0, experience: 100, qualification: 100 },
        weights: { requiredSkills: 40, preferredSkills: 20, textSimilarity: 25, experience: 10, qualification: 5 },
        matchingSkills: ['Docker', 'Kubernetes', 'AWS'],
        missingRequiredSkills: ['React.js', 'Node.js', 'JavaScript', 'MongoDB', 'REST APIs'],
        missingPreferredSkills: ['TypeScript', 'GraphQL'],
        additionalSkills: ['Go', 'Python', 'Terraform', 'CI/CD', 'Linux', 'Microservices'],
        recommendation: `Potential match (< ${thresholdToUse}%). Notable gaps in required skills. Not eligible for shortlisting.`,
        explanation: 'Matched 0/5 required skills. Missing required: React.js, Node.js, JavaScript, MongoDB, REST APIs. Strong DevOps background but lacks required web framework stack.',
      },
    },
  ];

  // 5. Create Sample Candidates for Senior Machine Learning Engineer
  const mlCandidates = [
    {
      name: 'Priya Patel',
      email: 'priya.patel@example.com',
      phone: '+1 (555) 312-9087',
      text: `Priya Patel - Senior Machine Learning & NLP Engineer
Email: priya.patel@example.com | Phone: +1 (555) 312-9087 | San Francisco, CA
Summary:
Senior Machine Learning Engineer with 6 years of experience deploying NLP, deep learning, and vector search pipelines in production using Python, TensorFlow, PyTorch, scikit-learn, and FastAPI.
Technical Skills:
Python, Machine Learning, Natural Language Processing (NLP), scikit-learn, TensorFlow, PyTorch, FastAPI, Docker, Pandas, NumPy, Apache Kafka, SQL.
Experience:
Lead ML Engineer at DataPulse AI (2022 - Present)
- Architected high-throughput NLP classification and semantic search services with Python, PyTorch, TensorFlow, and FastAPI in Docker containers.
Machine Learning Engineer at Quantix Labs (2020 - 2022)
- Built predictive models with scikit-learn, Pandas, and Apache Kafka streaming pipelines.
Education:
Master of Science (M.S.) in Machine Learning, Stanford University (2020)`,
      skills: ['Python', 'Machine Learning', 'scikit-learn', 'TensorFlow', 'Natural Language Processing (NLP)', 'PyTorch', 'FastAPI', 'Docker', 'Pandas', 'Apache Kafka'],
      years: 6.0,
      quals: [{ degree: "Master of Science (M.S.)", rawText: 'Master of Science (M.S.) in Machine Learning (2020)', year: '2020' }],
      evidence: {
        'Python': 'Architected high-throughput NLP services with Python and FastAPI',
        'Machine Learning': '6 years deploying Machine Learning and deep learning models',
        'scikit-learn': 'Built predictive models with scikit-learn and Pandas',
        'TensorFlow': 'Deployed deep learning pipelines using TensorFlow and PyTorch',
        'Natural Language Processing (NLP)': 'Designed semantic search and NLP classification systems',
      },
      fallbackEval: {
        overallScore: 93.4,
        componentScores: { requiredSkills: 100, preferredSkills: 100, textSimilarity: 86.0, experience: 100, qualification: 100 },
        weights: { requiredSkills: 40, preferredSkills: 20, textSimilarity: 25, experience: 10, qualification: 5 },
        matchingSkills: ['Python', 'Machine Learning', 'scikit-learn', 'TensorFlow', 'Natural Language Processing (NLP)', 'PyTorch', 'FastAPI', 'Docker', 'Pandas', 'Apache Kafka'],
        missingRequiredSkills: [],
        missingPreferredSkills: [],
        additionalSkills: ['NumPy', 'SQL'],
        recommendation: `Strong match (≥ ${thresholdToUse}%). Top-tier candidate for immediate interview.`,
        explanation: 'Matched 5/5 required skills and 5/5 preferred skills with 6 years of production ML/NLP experience.',
      },
    },
    {
      name: 'Dr. Aris Thorne',
      email: 'aris.thorne@example.com',
      phone: '+1 (555) 601-4421',
      text: `Dr. Aris Thorne - Applied AI Scientist
Email: aris.thorne@example.com | Boston, MA
Summary:
Ph.D. in Artificial Intelligence with 5 years of research and production experience in Natural Language Processing (NLP), Python, scikit-learn, and TensorFlow.
Technical Skills:
Python, Machine Learning, Natural Language Processing (NLP), TensorFlow, scikit-learn, PyTorch, Pandas, Docker, Deep Learning.
Experience:
Applied Scientist at DeepLexicon (2021 - Present)
- Developed transformer-based NLP pipelines using Python, TensorFlow, and PyTorch.
Research Scientist at MIT CSAIL (2019 - 2021)
- Published 8 peer-reviewed papers on vector embeddings and scikit-learn benchmarks.
Education:
Ph.D. / Doctorate in Computer Science, MIT (2019)`,
      skills: ['Python', 'Machine Learning', 'scikit-learn', 'TensorFlow', 'Natural Language Processing (NLP)', 'PyTorch', 'Docker', 'Pandas'],
      years: 5.0,
      quals: [{ degree: 'Ph.D. / Doctorate', rawText: 'Ph.D. in Computer Science, MIT (2019)', year: '2019' }],
      evidence: {
        'Python': 'Developed transformer-based NLP pipelines using Python',
        'TensorFlow': 'Productionized neural models in TensorFlow and PyTorch',
        'Natural Language Processing (NLP)': '5 years research and production experience in NLP',
      },
      fallbackEval: {
        overallScore: 87.8,
        componentScores: { requiredSkills: 100, preferredSkills: 60, textSimilarity: 81.2, experience: 95, qualification: 100 },
        weights: { requiredSkills: 40, preferredSkills: 20, textSimilarity: 25, experience: 10, qualification: 5 },
        matchingSkills: ['Python', 'Machine Learning', 'scikit-learn', 'TensorFlow', 'Natural Language Processing (NLP)', 'PyTorch', 'Docker', 'Pandas'],
        missingRequiredSkills: [],
        missingPreferredSkills: ['FastAPI', 'Apache Kafka'],
        additionalSkills: ['Deep Learning'],
        recommendation: `Strong match (≥ ${thresholdToUse}%). Qualifies for shortlisting.`,
        explanation: 'Matched 5/5 required skills with Ph.D. qualification and strong NLP track record.',
      },
    },
    {
      name: 'Vikram Nair',
      email: 'vikram.nair@example.com',
      phone: '+91 98450 22190',
      text: `Vikram Nair - Data Scientist
Email: vikram.nair@example.com | Bengaluru, India
Summary:
Data Scientist with 3 years of experience building analytics dashboards, regression models, and Python ETL workflows using scikit-learn and Pandas.
Technical Skills:
Python, Machine Learning, scikit-learn, Pandas, SQL, Tableau, Power BI, Statistics.
Experience:
Data Scientist at FinSight Analytics (2023 - Present)
- Built customer churn prediction models in Python and scikit-learn.
Data Analyst at RetailIQ (2021 - 2023)
- Automated SQL reporting and Pandas data pipelines.
Education:
Bachelor of Technology (B.Tech) in Data Science, NIT Surathkal (2021)`,
      skills: ['Python', 'Machine Learning', 'scikit-learn', 'Pandas', 'SQL', 'Tableau'],
      years: 3.0,
      quals: [{ degree: 'Bachelor of Technology (B.Tech)', rawText: 'B.Tech in Data Science (2021)', year: '2021' }],
      evidence: {
        'Python': 'Built customer churn prediction models in Python',
        'scikit-learn': 'Trained classification and regression models with scikit-learn',
      },
      fallbackEval: {
        overallScore: 63.5,
        componentScores: { requiredSkills: 60, preferredSkills: 20, textSimilarity: 64.0, experience: 75, qualification: 80 },
        weights: { requiredSkills: 40, preferredSkills: 20, textSimilarity: 25, experience: 10, qualification: 5 },
        matchingSkills: ['Python', 'Machine Learning', 'scikit-learn', 'Pandas'],
        missingRequiredSkills: ['TensorFlow', 'Natural Language Processing (NLP)'],
        missingPreferredSkills: ['Docker', 'PyTorch', 'FastAPI', 'Apache Kafka'],
        additionalSkills: ['SQL', 'Tableau'],
        recommendation: `Moderate match (< ${thresholdToUse}%). Missing TensorFlow and NLP depth.`,
        explanation: 'Matched 3/5 required skills; below 4 years minimum experience requirement.',
      },
    },
  ];

  // 6. Create Sample Candidates for Frontend React Engineer
  const frontendCandidates = [
    {
      name: 'Aisha Verma',
      email: 'aisha.verma@example.com',
      phone: '+1 (555) 774-2091',
      text: `Aisha Verma - Senior Frontend React Engineer
Email: aisha.verma@example.com | New York, NY
Summary:
Frontend specialist with 4.5 years crafting responsive, accessible SaaS interfaces using React.js, TypeScript, Next.js, Tailwind CSS, HTML5, CSS3, Redux, and Jest.
Technical Skills:
React.js, TypeScript, JavaScript, HTML5, CSS3, Next.js, Tailwind CSS, Redux, Jest, GraphQL, REST APIs, Figma, Git.
Experience:
Senior Frontend Engineer at CloudCanvas (2022 - Present)
- Led design system migration to React.js, TypeScript, and Tailwind CSS with 95% Jest test coverage.
Frontend Developer at PixelForge (2020 - 2022)
- Built interactive analytics dashboards using Next.js, Redux, and GraphQL.
Education:
Bachelor of Science (B.S.) in Computer Science, NYU (2020)`,
      skills: ['React.js', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'Next.js', 'Tailwind CSS', 'Redux', 'Jest', 'GraphQL'],
      years: 4.5,
      quals: [{ degree: "Bachelor's Degree", rawText: 'Bachelor of Science (B.S.) in Computer Science, NYU (2020)', year: '2020' }],
      evidence: {
        'React.js': 'Led design system migration to React.js and TypeScript',
        'TypeScript': '4.5 years building SaaS interfaces in TypeScript',
        'CSS3': 'Crafted responsive layouts using HTML5, CSS3, and Tailwind CSS',
      },
      fallbackEval: {
        overallScore: 91.5,
        componentScores: { requiredSkills: 100, preferredSkills: 100, textSimilarity: 84.0, experience: 100, qualification: 100 },
        weights: { requiredSkills: 40, preferredSkills: 20, textSimilarity: 25, experience: 10, qualification: 5 },
        matchingSkills: ['React.js', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'Next.js', 'Tailwind CSS', 'Redux', 'Jest', 'GraphQL'],
        missingRequiredSkills: [],
        missingPreferredSkills: [],
        additionalSkills: ['REST APIs', 'Figma', 'Git'],
        recommendation: `Strong match (≥ ${thresholdToUse}%). Immediate shortlist candidate.`,
        explanation: 'Matched 5/5 required and 5/5 preferred frontend skills with 4.5 years of relevant experience.',
      },
    },
    {
      name: 'Daniel Brooks',
      email: 'daniel.brooks@example.com',
      phone: '+1 (555) 945-1182',
      text: `Daniel Brooks - React UI Developer
Email: daniel.brooks@example.com | Chicago, IL
Summary:
UI Developer with 3 years of experience creating modern web applications in React.js, JavaScript, TypeScript, HTML5, CSS3, and Redux.
Technical Skills:
React.js, JavaScript, TypeScript, HTML5, CSS3, Redux, Tailwind CSS, REST APIs, Git.
Experience:
Frontend Engineer at ShopStream (2022 - Present)
- Built e-commerce checkout and product catalog interfaces in React.js and TypeScript.
Education:
Bachelor of Technology (B.Tech) in Software Engineering (2022)`,
      skills: ['React.js', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3', 'Redux', 'Tailwind CSS', 'REST APIs', 'Git'],
      years: 3.0,
      quals: [{ degree: 'Bachelor of Technology (B.Tech)', rawText: 'B.Tech in Software Engineering (2022)', year: '2022' }],
      evidence: {
        'React.js': 'Built e-commerce interfaces in React.js and TypeScript',
        'JavaScript': '3 years modern JavaScript and CSS3 UI development',
      },
      fallbackEval: {
        overallScore: 82.6,
        componentScores: { requiredSkills: 100, preferredSkills: 40, textSimilarity: 78.4, experience: 92, qualification: 100 },
        weights: { requiredSkills: 40, preferredSkills: 20, textSimilarity: 25, experience: 10, qualification: 5 },
        matchingSkills: ['React.js', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3', 'Redux', 'Tailwind CSS'],
        missingRequiredSkills: [],
        missingPreferredSkills: ['Next.js', 'Jest', 'GraphQL'],
        additionalSkills: ['REST APIs', 'Git'],
        recommendation: `Strong match (≥ ${thresholdToUse}%). Meets core frontend criteria.`,
        explanation: 'Matched 5/5 required skills with 3 years experience.',
      },
    },
    {
      name: 'Mei Lin',
      email: 'mei.lin@example.com',
      phone: '+1 (555) 338-6710',
      text: `Mei Lin - Junior Web Designer & Developer
Email: mei.lin@example.com | Los Angeles, CA
Summary:
Creative Web Designer with 1.5 years of experience designing marketing websites with HTML5, CSS3, JavaScript, and Figma.
Technical Skills:
HTML5, CSS3, JavaScript, Figma, WordPress, Bootstrap, Adobe XD.
Experience:
Web Designer at BrightBrand Agency (2024 - Present)
- Built landing pages with HTML5, CSS3, and vanilla JavaScript.
Education:
Bachelor's Degree in Digital Media Design (2024)`,
      skills: ['HTML5', 'CSS3', 'JavaScript', 'Figma', 'Bootstrap'],
      years: 1.5,
      quals: [{ degree: "Bachelor's Degree", rawText: "Bachelor's Degree in Digital Media Design (2024)", year: '2024' }],
      evidence: {
        'HTML5': 'Built responsive landing pages with HTML5 and CSS3',
        'JavaScript': 'Implemented interactive UI components in JavaScript',
      },
      fallbackEval: {
        overallScore: 54.2,
        componentScores: { requiredSkills: 60, preferredSkills: 0, textSimilarity: 56.8, experience: 65, qualification: 90 },
        weights: { requiredSkills: 40, preferredSkills: 20, textSimilarity: 25, experience: 10, qualification: 5 },
        matchingSkills: ['HTML5', 'CSS3', 'JavaScript'],
        missingRequiredSkills: ['React.js', 'TypeScript'],
        missingPreferredSkills: ['Next.js', 'Tailwind CSS', 'Redux', 'Jest', 'GraphQL'],
        additionalSkills: ['Figma', 'Bootstrap'],
        recommendation: `Moderate match (< ${thresholdToUse}%). Lacks React.js and TypeScript experience.`,
        explanation: 'Matched 3/5 required skills. Missing React.js and TypeScript.',
      },
    },
  ];

  const fullstackEvals = await seedCandidatesForJob(userId, fullstackJob, sampleCandidates, thresholdToUse);
  const mlEvals = await seedCandidatesForJob(userId, aiJob, mlCandidates, thresholdToUse);
  const frontendEvals = await seedCandidatesForJob(userId, frontendJob, frontendCandidates, thresholdToUse);

  const allEvaluations = [...fullstackEvals, ...mlEvals, ...frontendEvals];
  const shortlistedCount = allEvaluations.filter((e) => e.overallScore >= thresholdToUse).length;

  return {
    success: true,
    message: `Sample demo jobs seeded successfully (3 jobs, ${allEvaluations.length} candidates). Shortlist threshold set to ${thresholdToUse}%. Shortlisted candidates: ${shortlistedCount}/${allEvaluations.length} (score ≥ ${thresholdToUse}%).`,
    shortlistThreshold: thresholdToUse,
    shortlistedCount,
    totalCandidates: allEvaluations.length,
  };
};

module.exports = { seedDemoDataForUser };
