'use strict';

module.exports.login = async (event) => {
  console.log(`[${process.env.STAGE}] ${process.env.PROJECT_NAME} login`);
  console.log('Event:', JSON.stringify(event));

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Hello from ${process.env.API_NAME} (${process.env.STAGE})!`,
    }),
  };
};


