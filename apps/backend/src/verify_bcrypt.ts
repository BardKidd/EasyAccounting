import bcrypt from 'bcrypt';

async function verify() {
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 12);
  console.log('Original:', password);
  console.log('Hashed:', hashedPassword);
  const match = await bcrypt.compare(password, hashedPassword);
  console.log('Match:', match);
}

verify();
