const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:52424/');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Job = mongoose.model('Job', new mongoose.Schema({}, { strict: false }));
  const Resume = mongoose.model('Resume', new mongoose.Schema({}, { strict: false }));
  const CandidateEvaluation = mongoose.model('CandidateEvaluation', new mongoose.Schema({}, { strict: false }));

  console.log('=== USERS ===');
  const users = await User.find();
  for (const u of users) {
    console.log(`User ID: ${u._id} | Name: ${u.name} | Email: ${u.email}`);
  }

  console.log('\n=== JOBS ===');
  const jobs = await Job.find();
  for (const j of jobs) {
    console.log(`Job: ${j._id} | Title: "${j.title}" | Owner: ${j.ownerId} | Threshold: ${j.shortlistThreshold}`);
    const resumes = await Resume.find({ jobId: j._id });
    console.log(`  Resumes (${resumes.length}):`);
    for (const r of resumes) {
      console.log(`    - Resume: ${r._id} | File: ${r.originalFileName} | Status: ${r.processingStatus} | Name: ${r.candidateDetails?.name} | Skills: ${(r.candidateDetails?.skills || []).join(', ')}`);
    }
    const evals = await CandidateEvaluation.find({ jobId: j._id });
    console.log(`  Candidate Evaluations (${evals.length}):`);
    for (const e of evals) {
      console.log(`    - Rank #${e.rank}: ${e.candidateName} | Score: ${e.overallScore}% | Status: ${e.reviewStatus} | Scores: ${JSON.stringify(e.componentScores)}`);
    }
  }

  await mongoose.disconnect();
}

check().catch(console.error);
