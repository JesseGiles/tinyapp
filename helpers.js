//function to check user database for a webform submitted email
const getUserByEmail = function(email, database) {
  console.log('Verifying if this is an existing email: ', email);
  for (const userID in database) {
    if (email === database[userID].email) {
      const user = database[userID];
      return user;
    }
  }
  return undefined;
};

module.exports = { getUserByEmail };