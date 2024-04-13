
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CaseSchema = new Schema({
  caseId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  dateFiled: {
    type: Date,
    required: true
  },
  court: {
    type: String, 
    required: true
  },
  status: {
    type: String,
    required: true
  }
});

const LawyerSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  caseId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  contact: {
    type: Number,
    required: true
  },
  barCouncilRegNo: {
    type: String,
    required: true
  },
  practiceAreas: {
    type: [String],
    required: true
  }
});


const JudgeSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  caseId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  Adhaar_no: {
    type: Number,
    required: true
  },
  education: {
    type: [String],
    required: true
  },
  professionalExperience: {
    type: [String],
    required: true
  },
  judicialAppointments: {
    type: [String],
    required: true
  }
});

const WitnessSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  caseId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  occupation: {
    type: String,
    required: true
  },
  statement: {
    type: String,
    required: true
  }
});


const ProofSchema = new Schema({
  caseId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  proofType: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  dateSubmitted: {
    type: Date,
    required: true
  },
  submittedBy: {
    type: Schema.Types.ObjectId,
    required: true
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    required: false
  },
  verifiedDate: {
    type: Date,
    required: false
  }
});


const LawyerDetailsSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  'last-name': String,
  email: {
    type: String,
    required: true
  },
  contact: {
    type: Number,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  aadhaar: {
    type: Number,
    required: true
  },
  barCouncilRegNo: {
    type: String,
    required: true
  },
  education: {
    type: String,
    required: true
  },
  practiceAreas: {
    type: [String],
    required: true
  },
  experience: {
    type: String,
    required: true
  }
});


const JudgeDetailsSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  Adhaar_no: {
    type: Number,
    required: true
  },
  education: {
    type: [String],
    required: true
  },
  professionalExperience: {
    type: [String],
    required: true
  },
  judicialAppointments: {
    type: [String],
    required: true
  }
});
const chatSchema = new Schema({
  caseId: {
    type: Schema.Types.ObjectId,
    required: true
  }, 
  message: [{
    type: Object,
    default: {}
  }],
  gptResponse: {
    type: String,
  }
})

module.exports = {
  Case_schema: mongoose.model('Case', CaseSchema),
  Lawyer_schema: mongoose.model('Lawyer', LawyerSchema),
  Judge_schema: mongoose.model('Judge', JudgeSchema),
  Witness_schema: mongoose.model('Witness', WitnessSchema),
  Proof_schema: mongoose.model('Proof', ProofSchema),
  LawyerDetails_schema: mongoose.model('LawyerDetails', LawyerDetailsSchema),
  JudgeDetails_schema: mongoose.model('JudgeDetails', JudgeDetailsSchema),
  chatSchema: mongoose.model('chats', chatSchema)
};
