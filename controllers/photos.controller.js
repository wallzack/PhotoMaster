const Photo = require('../models/photo.model');
const Voter = require('../models/Voter.model');
const requestIp = require('request-ip');

function escape(test) {
  return text.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

exports.add = async (req, res) => {

  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    if(title && author && email && file) { // if fields are not empty...

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const fileExt = fileName.split('.').slice(-1)[0];

      const pattern = new RegExp(/(([A-z]|\s)*)/, 'g');
      const matchedAuthor = author.match(pattern).join('');
      const matchedTitle = title.match(pattern).join('');
      const mailRegEx = new RegExp(/^[0-9a-z_.-]+@[0-9a-z.-]+\.[a-z]{2,3}$/, 'i');
      const matchedEmail = email.match(mailRegEx).join('');

      if (fileExt === 'jpg' || fileExt === 'gif' || fileExt === 'png') {
        const newPhoto = new Photo({ title: matchedTitle, author: matchedAuthor, email: matchedEmail, src: fileName, votes: 0 });
        await newPhoto.save(); // ...save new photo in DB
        res.json(newPhoto);
      } else {
        throw new Error('Wrong input!');
      }

    } else {
      throw new Error('Wrong input!');
    }

  } catch(err) {
    res.status(500).json(err);
  }

};

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }

};

exports.vote = async (req, res) => {

  try {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    const clientIp = requestIp.getClientIp(req);
    const voterExists = await Voter.findOne({ user: clientIp });

    if(!photoToUpdate) {
      res.status(404).json({ message: 'Not found' });
    } else if(!voterExists) {  
      const newVoter = new Voter({ user: clientIp, votes: [photoToUpdate] });
      newVoter.save();
      console.log('newVoter', newVoter);

      photoToUpdate.votes++;
      photoToUpdate.save();
      res.send({ message: 'OK' });

    } else if(voterExists) {
      const isVoted = voterExists.votes.includes(photoToUpdate._id);
      
      if (!isVoted) {
        voterExists.votes.push(photoToUpdate);
        voterExists.save();

        photoToUpdate.votes++;
        photoToUpdate.save();
      } else {
        res.status(500).json({ message: 'Already voted for that picture' });
      }
    }
  } catch(err) {
    res.status(500).json(err);
  }

};