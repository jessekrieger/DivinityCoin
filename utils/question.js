const readline = require('readline');

module.exports = (query, acceptedAnswers = null, defaultAnswer = '') => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve, reject) => {
    rl.question(query, (answer) => {
      if (answer === '') {
        answer = defaultAnswer;
      }
      if (acceptedAnswers !== null && !acceptedAnswers.includes(answer.toLowerCase())) {
        rl.close();
        reject(new Error(`Answer must be one of ${acceptedAnswers}`));
      } else {
        rl.close();
        resolve(answer.toLowerCase());
      }
    });
  });
};
