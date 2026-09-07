import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(process.cwd(), '.env.local') });
config();

import { getDataSource } from './lib/db/data-source';
import { v4 as uuidv4 } from 'uuid';

// Helper for dates
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function formatDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

// ── Master Malayalam & English Book Catalog ────────────────────────────────────
interface BookSeed {
  title: string;
  isbn: string;
  barcode: string;
  price: number;
  costPrice: number;
  author: string;
  category: string;
  publisher: string;
  centralQty: number;
  threshold: number;
  language: 'MALAYALAM' | 'ENGLISH';
}

const malayalamAndEnglishBooks: BookSeed[] = [
  // ── MALAYALAM CLASSICS & CONTEMPORARY FICTION ──
  {
    title: 'Aadujeevitham (ആടുജീവിതം)',
    isbn: '978-8126419999',
    barcode: '9788126419999',
    price: 299.00,
    costPrice: 175.00,
    author: 'Benyamin (ബെന്യാമിൻ)',
    category: 'Fiction (നോവൽ)',
    publisher: 'DC Books',
    centralQty: 180,
    threshold: 25,
    language: 'MALAYALAM',
  },
  {
    title: 'Randamoozham (രണ്ടാമൂഴം)',
    isbn: '978-8171300051',
    barcode: '9788171300051',
    price: 450.00,
    costPrice: 270.00,
    author: 'M. T. Vasudevan Nair (എം. ടി. വാസുദേവൻ നായർ)',
    category: 'Classics (ക്ലാസിക്സ്)',
    publisher: 'Current Books',
    centralQty: 140,
    threshold: 20,
    language: 'MALAYALAM',
  },
  {
    title: 'Khasakkinte Ithihasam (ഖസാക്കിന്റെ ഇതിഹാസം)',
    isbn: '978-8171301263',
    barcode: '9788171301263',
    price: 350.00,
    costPrice: 210.00,
    author: 'O. V. Vijayan (ഒ. വി. വിജയൻ)',
    category: 'Fiction (നോവൽ)',
    publisher: 'DC Books',
    centralQty: 120,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Aarachar (ആരാച്ചാർ)',
    isbn: '978-8126438365',
    barcode: '9788126438365',
    price: 599.00,
    costPrice: 360.00,
    author: 'K. R. Meera (കെ. ആർ. മീര)',
    category: 'Fiction (നോവൽ)',
    publisher: 'DC Books',
    centralQty: 110,
    threshold: 20,
    language: 'MALAYALAM',
  },
  {
    title: 'Balyakalasakhi (ബാല്യകാലസഖി)',
    isbn: '978-8171300884',
    barcode: '9788171300884',
    price: 150.00,
    costPrice: 85.00,
    author: 'Vaikom Muhammad Basheer (വൈക്കം മുഹമ്മദ് ബഷീർ)',
    category: 'Classics (ക്ലാസിക്സ്)',
    publisher: 'DC Books',
    centralQty: 220,
    threshold: 30,
    language: 'MALAYALAM',
  },
  {
    title: 'Mathilukal (മതിലുകൾ)',
    isbn: '978-8171300891',
    barcode: '9788171300891',
    price: 140.00,
    costPrice: 80.00,
    author: 'Vaikom Muhammad Basheer (വൈക്കം മുഹമ്മദ് ബഷീർ)',
    category: 'Fiction (നോവൽ)',
    publisher: 'DC Books',
    centralQty: 160,
    threshold: 25,
    language: 'MALAYALAM',
  },
  {
    title: 'Pathummayude Aadu (പാത്തുമ്മായുടെ ആട്)',
    isbn: '978-8171300907',
    barcode: '9788171300907',
    price: 160.00,
    costPrice: 90.00,
    author: 'Vaikom Muhammad Basheer (വൈക്കം മുഹമ്മദ് ബഷീർ)',
    category: 'Humor & Fiction (ഹാസ്യം)',
    publisher: 'DC Books',
    centralQty: 200,
    threshold: 25,
    language: 'MALAYALAM',
  },
  {
    title: 'Naalukettu (നാലുകെട്ട്)',
    isbn: '978-8171300068',
    barcode: '9788171300068',
    price: 220.00,
    costPrice: 130.00,
    author: 'M. T. Vasudevan Nair (എം. ടി. വാസുദേവൻ നായർ)',
    category: 'Classics (ക്ലാസിക്സ്)',
    publisher: 'Current Books',
    centralQty: 130,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Mayyazhippuzhayude Theerangalil (മയ്യഴിപ്പുഴയുടെ തീരങ്ങളിൽ)',
    isbn: '978-8171302482',
    barcode: '9788171302482',
    price: 320.00,
    costPrice: 190.00,
    author: 'M. Mukundan (എം. മുകുന്ദൻ)',
    category: 'Fiction (നോവൽ)',
    publisher: 'DC Books',
    centralQty: 115,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Oru Sankeerthanam Pole (ഒരു സങ്കീർത്തനം പോലെ)',
    isbn: '978-8171301478',
    barcode: '9788171301478',
    price: 280.00,
    costPrice: 160.00,
    author: 'Perumbadavam Sreedharan (പെരുമ്പടവം ശ്രീധരൻ)',
    category: 'Fiction (നോവൽ)',
    publisher: 'DC Books',
    centralQty: 150,
    threshold: 20,
    language: 'MALAYALAM',
  },
  {
    title: 'Oru Desathinte Katha (ഒരു ദേശത്തിന്റെ കഥ)',
    isbn: '978-8171300303',
    barcode: '9788171300303',
    price: 480.00,
    costPrice: 290.00,
    author: 'S. K. Pottekkatt (എസ്. കെ. പൊറ്റെക്കാട്ട്)',
    category: 'Fiction (നോവൽ)',
    publisher: 'Current Books',
    centralQty: 95,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Ente Katha (എന്റെ കഥ)',
    isbn: '978-8171300624',
    barcode: '9788171300624',
    price: 240.00,
    costPrice: 140.00,
    author: 'Madhavikutty / Kamala Das (മാധവിക്കുട്ടി)',
    category: 'Autobiography (ആത്മകഥ)',
    publisher: 'Current Books',
    centralQty: 175,
    threshold: 25,
    language: 'MALAYALAM',
  },
  {
    title: 'Chidambara Smarana (ചിദംബര സ്മരണ)',
    isbn: '978-8126402434',
    barcode: '9788126402434',
    price: 210.00,
    costPrice: 125.00,
    author: 'Balachandran Chullikkad (ബാലചന്ദ്രൻ ചുള്ളിക്കാട്)',
    category: 'Memoir (ഓർമ്മക്കുറിപ്പുകൾ)',
    publisher: 'DC Books',
    centralQty: 100,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Chemmeen (ചെമ്മീൻ)',
    isbn: '978-8171300181',
    barcode: '9788171300181',
    price: 250.00,
    costPrice: 150.00,
    author: 'Thakazhi Sivasankara Pillai (തകഴി ശിവശങ്കരപ്പിള്ള)',
    category: 'Classics (ക്ലാസിക്സ്)',
    publisher: 'DC Books',
    centralQty: 130,
    threshold: 20,
    language: 'MALAYALAM',
  },
  {
    title: 'Kayar (കയർ)',
    isbn: '978-8171300198',
    barcode: '9788171300198',
    price: 850.00,
    costPrice: 520.00,
    author: 'Thakazhi Sivasankara Pillai (തകഴി ശിവശങ്കരപ്പിള്ള)',
    category: 'Classics (ക്ലാസിക്സ്)',
    publisher: 'DC Books',
    centralQty: 60,
    threshold: 10,
    language: 'MALAYALAM',
  },
  {
    title: 'Manushyanu Oru Aamukham (മനുഷ്യന് ഒരു ആമുഖം)',
    isbn: '978-8126430680',
    barcode: '9788126430680',
    price: 495.00,
    costPrice: 300.00,
    author: 'Subhash Chandran (സുഭാഷ് ചന്ദ്രൻ)',
    category: 'Fiction (നോവൽ)',
    publisher: 'Current Books',
    centralQty: 90,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Nireeshwaran (നിരീശ്വരൻ)',
    isbn: '978-8126451630',
    barcode: '9788126451630',
    price: 380.00,
    costPrice: 230.00,
    author: 'V. J. James (വി. ജെ. ജെയിംസ്)',
    category: 'Fiction (നോവൽ)',
    publisher: 'DC Books',
    centralQty: 85,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Francis Itty Cora (ഫ്രാൻസിസ് ഇട്ടിക്കോര)',
    isbn: '978-8126424535',
    barcode: '9788126424535',
    price: 420.00,
    costPrice: 250.00,
    author: 'T. D. Ramakrishnan (ടി. ഡി. രാമകൃഷ്ണൻ)',
    category: 'Fiction (നോവൽ)',
    publisher: 'DC Books',
    centralQty: 95,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Sugandhi Enna Andal Devanayaki (സുഗന്ധി എന്ന ആണ്ടാൾ ദേവനായകി)',
    isbn: '978-8126450633',
    barcode: '9788126450633',
    price: 390.00,
    costPrice: 240.00,
    author: 'T. D. Ramakrishnan (ടി. ഡി. രാമകൃഷ്ണൻ)',
    category: 'Fiction (നോവൽ)',
    publisher: 'DC Books',
    centralQty: 80,
    threshold: 12,
    language: 'MALAYALAM',
  },
  {
    title: 'Indulekha (ഇന്ദുലേഖ)',
    isbn: '978-8170992386',
    barcode: '9788170992386',
    price: 190.00,
    costPrice: 110.00,
    author: 'O. Chandu Menon (ഒ. ചന്തുമേനോൻ)',
    category: 'Classics (ക്ലാസിക്സ്)',
    publisher: 'National Book Stall',
    centralQty: 110,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Kallan Pavithran (കള്ളൻ പവിത്രൻ)',
    isbn: '978-8126407767',
    barcode: '9788126407767',
    price: 220.00,
    costPrice: 130.00,
    author: 'P. Padmarajan (പി. പദ്മരാജൻ)',
    category: 'Short Stories (ചെറുകഥകൾ)',
    publisher: 'DC Books',
    centralQty: 105,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Yakshi (യക്ഷി)',
    isbn: '978-8171300457',
    barcode: '9788171300457',
    price: 260.00,
    costPrice: 155.00,
    author: 'Malayattoor Ramakrishnan (മലയാറ്റൂർ രാമകൃഷ്ണൻ)',
    category: 'Fiction (നോവൽ)',
    publisher: 'Current Books',
    centralQty: 125,
    threshold: 20,
    language: 'MALAYALAM',
  },
  {
    title: 'Verukal (വേരുകൾ)',
    isbn: '978-8171300464',
    barcode: '9788171300464',
    price: 210.00,
    costPrice: 125.00,
    author: 'Malayattoor Ramakrishnan (മലയാറ്റൂർ രാമകൃഷ്ണൻ)',
    category: 'Fiction (നോവൽ)',
    publisher: 'Current Books',
    centralQty: 100,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Agnisakshi (അഗ്നിസാക്ഷി)',
    isbn: '978-8171300754',
    barcode: '9788171300754',
    price: 230.00,
    costPrice: 135.00,
    author: 'Lalithambika Antharjanam (ലളിതാംബിക അന്തർജ്ജനം)',
    category: 'Classics (ക്ലാസിക്സ്)',
    publisher: 'Current Books',
    centralQty: 110,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Kadammanittayude Kavithakal (കടമ്മനിട്ടയുടെ കവിതകൾ)',
    isbn: '978-8126418855',
    barcode: '9788126418855',
    price: 280.00,
    costPrice: 165.00,
    author: 'Kadammanitta Ramakrishnan (കടമ്മനിട്ട രാമകൃഷ്ണൻ)',
    category: 'Poetry (കവിത)',
    publisher: 'Olive Publications',
    centralQty: 75,
    threshold: 10,
    language: 'MALAYALAM',
  },
  {
    title: 'Ayyappa Panikerude Krithikal (അയ്യപ്പപ്പണിക്കരുടെ കൃതികൾ)',
    isbn: '978-8126416622',
    barcode: '9788126416622',
    price: 550.00,
    costPrice: 330.00,
    author: 'K. Ayyappa Paniker (കെ. അയ്യപ്പപ്പണിക്കർ)',
    category: 'Poetry (കവിത)',
    publisher: 'DC Books',
    centralQty: 60,
    threshold: 10,
    language: 'MALAYALAM',
  },
  {
    title: 'Ujjayini (ഉജ്ജയിനി)',
    isbn: '978-8126401017',
    barcode: '9788126401017',
    price: 360.00,
    costPrice: 215.00,
    author: 'O. N. V. Kurup (ഒ. എൻ. വി. കുറുപ്പ്)',
    category: 'Poetry (കവിത)',
    publisher: 'DC Books',
    centralQty: 85,
    threshold: 12,
    language: 'MALAYALAM',
  },
  {
    title: 'Kerala Charithram (കേരള ചരിത്രം)',
    isbn: '978-8126415885',
    barcode: '9788126415885',
    price: 650.00,
    costPrice: 400.00,
    author: 'A. Sreedhara Menon (എ. ശ്രീധരമേനോൻ)',
    category: 'History (ചരിത്രം)',
    publisher: 'DC Books',
    centralQty: 90,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Oru Theruvinte Katha (ഒരു തെരുവിന്റെ കഥ)',
    isbn: '978-8171300310',
    barcode: '9788171300310',
    price: 290.00,
    costPrice: 170.00,
    author: 'S. K. Pottekkatt (എസ്. കെ. പൊറ്റെക്കാട്ട്)',
    category: 'Fiction (നോവൽ)',
    publisher: 'Poorna Publications',
    centralQty: 110,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Smarakasilakal (സ്മാരകശിലകൾ)',
    isbn: '978-8171300587',
    barcode: '9788171300587',
    price: 340.00,
    costPrice: 205.00,
    author: 'Punathil Kunjabdulla (പുനത്തിൽ കുഞ്ഞബ്ദുള്ള)',
    category: 'Fiction (നോവൽ)',
    publisher: 'DC Books',
    centralQty: 95,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Appuppan Thaadi (അപ്പൂപ്പൻ താടി)',
    isbn: '978-8171801206',
    barcode: '9788171801206',
    price: 120.00,
    costPrice: 70.00,
    author: 'Sippy Pallippuram (സിപ്പി പള്ളിപ്പുറം)',
    category: "Children's (ബാലസാഹിത്യം)",
    publisher: 'Poorna Publications',
    centralQty: 140,
    threshold: 20,
    language: 'MALAYALAM',
  },
  {
    title: 'Poompatta Kathakal (പൂമ്പാറ്റ കഥകൾ)',
    isbn: '978-8171801213',
    barcode: '9788171801213',
    price: 150.00,
    costPrice: 85.00,
    author: 'K. G. Sethunath (കെ. ജി. സേതുനാഥ്)',
    category: "Children's (ബാലസാഹിത്യം)",
    publisher: 'Poorna Publications',
    centralQty: 120,
    threshold: 20,
    language: 'MALAYALAM',
  },
  {
    title: 'Kottaram Thettukal (കൊട്ടാരം തെറ്റുകൾ)',
    isbn: '978-8126409822',
    barcode: '9788126409822',
    price: 270.00,
    costPrice: 160.00,
    author: 'M. P. Narayana Pillai (എം. പി. നാരായണപിള്ള)',
    category: 'Essays & Critique (ലേഖനങ്ങൾ)',
    publisher: 'Olive Publications',
    centralQty: 80,
    threshold: 10,
    language: 'MALAYALAM',
  },
  {
    title: 'Janmadinam (ജന്മദിനം)',
    isbn: '978-8171300914',
    barcode: '9788171300914',
    price: 180.00,
    costPrice: 105.00,
    author: 'Vaikom Muhammad Basheer (വൈക്കം മുഹമ്മദ് ബഷീർ)',
    category: 'Short Stories (ചെറുകഥകൾ)',
    publisher: 'DC Books',
    centralQty: 110,
    threshold: 15,
    language: 'MALAYALAM',
  },
  {
    title: 'Jeevithapaatha (ജീവിതപ്പാത)',
    isbn: '978-8126411238',
    barcode: '9788126411238',
    price: 420.00,
    costPrice: 250.00,
    author: 'Cherukad (ചെറുകാട്)',
    category: 'Autobiography (ആത്മകഥ)',
    publisher: 'Chintha Publishers',
    centralQty: 70,
    threshold: 10,
    language: 'MALAYALAM',
  },

  // ── ENGLISH BOOKS (POPULAR SELECTIONS & INDIAN LITERATURE) ──
  {
    title: 'The God of Small Things',
    isbn: '978-0143031178',
    barcode: '9780143031178',
    price: 499.00,
    costPrice: 299.00,
    author: 'Arundhati Roy',
    category: 'Fiction (English)',
    publisher: 'Penguin Books India',
    centralQty: 110,
    threshold: 20,
    language: 'ENGLISH',
  },
  {
    title: 'The Ivory Throne: Chronicles of the House of Travancore',
    isbn: '978-9351770282',
    barcode: '9789351770282',
    price: 699.00,
    costPrice: 420.00,
    author: 'Manu S. Pillai',
    category: 'History (English)',
    publisher: 'HarperCollins India',
    centralQty: 90,
    threshold: 15,
    language: 'ENGLISH',
  },
  {
    title: 'Rebel Sultans: The Deccan from Khilji to Shivaji',
    isbn: '978-9386228734',
    barcode: '9789386228734',
    price: 599.00,
    costPrice: 360.00,
    author: 'Manu S. Pillai',
    category: 'History (English)',
    publisher: 'HarperCollins India',
    centralQty: 75,
    threshold: 12,
    language: 'ENGLISH',
  },
  {
    title: 'Atomic Habits: An Easy & Proven Way to Build Good Habits',
    isbn: '978-1847941831',
    barcode: '9781847941831',
    price: 499.00,
    costPrice: 280.00,
    author: 'James Clear',
    category: 'Self Help',
    publisher: 'Penguin Random House',
    centralQty: 140,
    threshold: 25,
    language: 'ENGLISH',
  },
  {
    title: 'The Psychology of Money',
    isbn: '978-9390166268',
    barcode: '9789390166268',
    price: 399.00,
    costPrice: 220.00,
    author: 'Morgan Housel',
    category: 'Self Help',
    publisher: 'Jaico Publishing House',
    centralQty: 130,
    threshold: 20,
    language: 'ENGLISH',
  },
  {
    title: 'Wings of Fire: An Autobiography',
    isbn: '978-8173711466',
    barcode: '9788173711466',
    price: 350.00,
    costPrice: 200.00,
    author: 'A. P. J. Abdul Kalam',
    category: 'Autobiography (English)',
    publisher: 'Universities Press',
    centralQty: 125,
    threshold: 20,
    language: 'ENGLISH',
  },
  {
    title: 'The Great Indian Novel',
    isbn: '978-0140120417',
    barcode: '9780140120417',
    price: 450.00,
    costPrice: 270.00,
    author: 'Shashi Tharoor',
    category: 'Fiction (English)',
    publisher: 'Penguin Books India',
    centralQty: 85,
    threshold: 15,
    language: 'ENGLISH',
  },
  {
    title: 'An Era of Darkness: The British Empire in India',
    isbn: '978-9383064656',
    barcode: '9789383064656',
    price: 599.00,
    costPrice: 360.00,
    author: 'Shashi Tharoor',
    category: 'History (English)',
    publisher: 'Aleph Book Company',
    centralQty: 80,
    threshold: 15,
    language: 'ENGLISH',
  },
  {
    title: 'Sapiens: A Brief History of Humankind',
    isbn: '978-0099590088',
    barcode: '9780099590088',
    price: 599.00,
    costPrice: 350.00,
    author: 'Yuval Noah Harari',
    category: 'Non-Fiction (English)',
    publisher: 'HarperCollins India',
    centralQty: 100,
    threshold: 15,
    language: 'ENGLISH',
  },
  {
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    isbn: '978-0132350884',
    barcode: '9780132350884',
    price: 699.00,
    costPrice: 420.00,
    author: 'Robert C. Martin',
    category: 'Technology',
    publisher: 'Pearson Education',
    centralQty: 70,
    threshold: 15,
    language: 'ENGLISH',
  },
];

// Kerala Bookstore Branches
const keralaBranches = [
  {
    code: 'WH-01',
    name: 'Central Warehouse - Ernakulam',
    type: 'WAREHOUSE',
    address: 'Plot 42, Major Industrial Estate, Kalamassery',
    city: 'Kochi',
    phone: '0484-2551122',
  },
  {
    code: 'BR-01',
    name: 'Kairali Books - Thiruvananthapuram',
    type: 'STORE',
    address: 'Near Secretariat, Statue Junction, MG Road',
    city: 'Thiruvananthapuram',
    phone: '0471-2473344',
  },
  {
    code: 'BR-02',
    name: 'Kairali Books - Kozhikode',
    type: 'STORE',
    address: 'Heritage Building, Sweet Meat Street (SM Street)',
    city: 'Kozhikode',
    phone: '0495-2725566',
  },
  {
    code: 'BR-03',
    name: 'Kairali Books - Kottayam',
    type: 'STORE',
    address: 'Publishers Hub, Baker Junction, MC Road',
    city: 'Kottayam',
    phone: '0481-2567788',
  },
  {
    code: 'BR-04',
    name: 'Kairali Books - Thrissur',
    type: 'STORE',
    address: 'City Centre Complex, Round North, Swaraj Round',
    city: 'Thrissur',
    phone: '0487-2339900',
  },
];

// Suppliers in Kerala / South India
const suppliersList = [
  {
    name: 'DC Books Distribution Network',
    contactPerson: 'Ravi Varma',
    phone: '9447101122',
    email: 'distribution@dcbooks.com',
    address: 'DC Building, Good Shepherd Street, Kottayam',
  },
  {
    name: 'Current Books Wholesale Depot',
    contactPerson: 'Biju Nair',
    phone: '9447202233',
    email: 'wholesale@currentbooks.com',
    address: 'Round West, Thrissur',
  },
  {
    name: 'Poorna Publications Central Logistics',
    contactPerson: 'Manoj Kumar',
    phone: '9447303344',
    email: 'supply@poornabooks.com',
    address: 'TBS Building, Stadium Road, Kozhikode',
  },
  {
    name: 'Kerala State Cooperative Book Society',
    contactPerson: 'Suresh Babu',
    phone: '9447404455',
    email: 'kscbs@keralabooks.org',
    address: 'Statue, Thiruvananthapuram',
  },
  {
    name: 'South India Book Distributors Ltd',
    contactPerson: 'Anand Mohan',
    phone: '9840115566',
    email: 'sales@sibd.in',
    address: 'Marine Drive, Ernakulam, Kochi',
  },
];

async function seed() {
  console.log('🌿 Connecting to database...');
  const ds = await getDataSource();
  const qr = ds.createQueryRunner();
  await qr.connect();

  try {
    // 1. Fetch Super Admin user ID
    const [superAdminRow] = await qr.query(
      `SELECT id FROM \`user\` WHERE \`email\` = 'superadmin@bms.com' LIMIT 1;`
    );
    if (!superAdminRow) {
      throw new Error('Super Admin user not found. Please run clean-dummy-data.ts first.');
    }
    const adminId = superAdminRow.id;
    console.log(`👤 Using Super Admin ID: ${adminId}`);

    // 2. Seed / Upsert Kerala Branches
    console.log('\n🏢 Seeding Kerala branches...');
    const branchMap = new Map<string, string>(); // code -> id

    for (const b of keralaBranches) {
      const existing = await qr.query(
        `SELECT id FROM \`branch\` WHERE \`code\` = ? LIMIT 1;`,
        [b.code]
      );
      let branchId: string;
      if (existing && existing.length > 0) {
        branchId = existing[0].id;
        await qr.query(
          `UPDATE \`branch\` 
           SET \`name\` = ?, \`type\` = ?, \`address\` = ?, \`city\` = ?, \`phone\` = ?, \`is_active\` = 1, \`updated_at\` = NOW()
           WHERE \`id\` = ?;`,
          [b.name, b.type, b.address, b.city, b.phone, branchId]
        );
      } else {
        branchId = uuidv4();
        await qr.query(
          `INSERT INTO \`branch\` (\`id\`, \`name\`, \`code\`, \`type\`, \`address\`, \`city\`, \`phone\`, \`is_active\`, \`created_at\`, \`updated_at\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW());`,
          [branchId, b.name, b.code, b.type, b.address, b.city, b.phone]
        );
      }
      branchMap.set(b.code, branchId);
      console.log(`  ✓ Branch ready: [${b.code}] ${b.name}`);
    }

    // 3. Seed Suppliers
    console.log('\n🚚 Seeding suppliers...');
    const supplierMap = new Map<string, string>();
    for (const s of suppliersList) {
      const existing = await qr.query(
        `SELECT id FROM \`supplier\` WHERE \`name\` = ? LIMIT 1;`,
        [s.name]
      );
      let supplierId: string;
      if (existing && existing.length > 0) {
        supplierId = existing[0].id;
      } else {
        supplierId = uuidv4();
        await qr.query(
          `INSERT INTO \`supplier\` (\`id\`, \`name\`, \`contact_person\`, \`phone\`, \`email\`, \`address\`, \`created_at\`, \`updated_at\`)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW());`,
          [supplierId, s.name, s.contactPerson, s.phone, s.email, s.address]
        );
      }
      supplierMap.set(s.name, supplierId);
    }
    console.log(`  ✓ ${suppliersList.length} Kerala & South India suppliers ready`);

    // 4. Seed Authors, Publishers, Categories, and Books
    console.log('\n📚 Seeding Malayalam & English book catalog & stock...');
    const authorCache = new Map<string, string>();
    const publisherCache = new Map<string, string>();
    const categoryCache = new Map<string, string>();
    const createdBooks: { id: string; title: string; price: number; costPrice: number; centralQty: number }[] = [];

    for (const item of malayalamAndEnglishBooks) {
      // Author
      let authorId = authorCache.get(item.author);
      if (!authorId) {
        const existingAuthor = await qr.query(`SELECT id FROM \`author\` WHERE \`name\` = ? LIMIT 1;`, [item.author]);
        if (existingAuthor && existingAuthor.length > 0) {
          authorId = existingAuthor[0].id;
        } else {
          authorId = uuidv4();
          await qr.query(`INSERT INTO \`author\` (\`id\`, \`name\`, \`created_at\`, \`updated_at\`) VALUES (?, ?, NOW(), NOW());`, [authorId, item.author]);
        }
        authorCache.set(item.author, authorId!);
      }

      // Publisher
      let publisherId = publisherCache.get(item.publisher);
      if (!publisherId) {
        const existingPub = await qr.query(`SELECT id FROM \`publisher\` WHERE \`name\` = ? LIMIT 1;`, [item.publisher]);
        if (existingPub && existingPub.length > 0) {
          publisherId = existingPub[0].id;
        } else {
          publisherId = uuidv4();
          await qr.query(`INSERT INTO \`publisher\` (\`id\`, \`name\`, \`created_at\`, \`updated_at\`) VALUES (?, ?, NOW(), NOW());`, [publisherId, item.publisher]);
        }
        publisherCache.set(item.publisher, publisherId!);
      }

      // Category
      let categoryId = categoryCache.get(item.category);
      if (!categoryId) {
        const existingCat = await qr.query(`SELECT id FROM \`category\` WHERE \`name\` = ? LIMIT 1;`, [item.category]);
        if (existingCat && existingCat.length > 0) {
          categoryId = existingCat[0].id;
        } else {
          categoryId = uuidv4();
          await qr.query(`INSERT INTO \`category\` (\`id\`, \`name\`, \`created_at\`, \`updated_at\`) VALUES (?, ?, NOW(), NOW());`, [categoryId, item.category]);
        }
        categoryCache.set(item.category, categoryId!);
      }

      // Book
      let bookId: string;
      const existingBook = await qr.query(`SELECT id FROM \`book\` WHERE \`isbn\` = ? OR \`barcode\` = ? LIMIT 1;`, [item.isbn, item.barcode]);
      if (existingBook && existingBook.length > 0) {
        bookId = existingBook[0].id;
        await qr.query(
          `UPDATE \`book\` 
           SET \`title\` = ?, \`price\` = ?, \`cost_price\` = ?, \`author_id\` = ?, \`category_id\` = ?, \`publisher_id\` = ?, \`is_active\` = 1, \`updated_at\` = NOW()
           WHERE \`id\` = ?;`,
          [item.title, item.price, item.costPrice, authorId, categoryId, publisherId, bookId]
        );
      } else {
        bookId = uuidv4();
        await qr.query(
          `INSERT INTO \`book\` (\`id\`, \`title\`, \`isbn\`, \`barcode\`, \`price\`, \`cost_price\`, \`author_id\`, \`category_id\`, \`publisher_id\`, \`is_active\`, \`created_at\`, \`updated_at\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW());`,
          [bookId, item.title, item.isbn, item.barcode, item.price, item.costPrice, authorId, categoryId, publisherId]
        );
      }
      createdBooks.push({ id: bookId, title: item.title, price: item.price, costPrice: item.costPrice, centralQty: item.centralQty });

      // Upsert Central Stock
      const existingStock = await qr.query(`SELECT id FROM \`central_stock\` WHERE \`book_id\` = ? LIMIT 1;`, [bookId]);
      if (existingStock && existingStock.length > 0) {
        await qr.query(
          `UPDATE \`central_stock\` SET \`quantity\` = ?, \`reorder_threshold\` = ?, \`updated_at\` = NOW() WHERE \`id\` = ?;`,
          [item.centralQty, item.threshold, existingStock[0].id]
        );
      } else {
        await qr.query(
          `INSERT INTO \`central_stock\` (\`id\`, \`book_id\`, \`quantity\`, \`reorder_threshold\`, \`created_at\`, \`updated_at\`)
           VALUES (?, ?, ?, ?, NOW(), NOW());`,
          [uuidv4(), bookId, item.centralQty, item.threshold]
        );
      }
    }
    console.log(`  ✓ Seeded ${createdBooks.length} titles (majority Malayalam classics & modern works) into catalog & central stock`);

    // 5. Seed Branch Inventory across Store Branches
    console.log('\n🏪 Distributing stock to branch stores...');
    const storeBranchCodes = ['BR-01', 'BR-02', 'BR-03', 'BR-04'];
    let branchStockCount = 0;

    for (const bCode of storeBranchCodes) {
      const bId = branchMap.get(bCode)!;
      for (let i = 0; i < createdBooks.length; i++) {
        const book = createdBooks[i];
        // Give each branch 8 to 30 copies of Malayalam books and 5 to 15 copies of English books
        const isMalyalam = i < 35;
        const qty = isMalyalam ? (10 + ((i * 3) % 25)) : (5 + (i % 12));
        const threshold = isMalyalam ? 6 : 4;

        await qr.query(
          `INSERT INTO \`branch_inventory\` (\`id\`, \`branch_id\`, \`book_id\`, \`quantity\`, \`reorder_threshold\`, \`created_at\`, \`updated_at\`)
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE \`quantity\` = VALUES(\`quantity\`), \`reorder_threshold\` = VALUES(\`reorder_threshold\`), \`updated_at\` = NOW();`,
          [uuidv4(), bId, book.id, qty, threshold]
        );
        branchStockCount++;
      }
    }
    console.log(`  ✓ Seeded ${branchStockCount} branch inventory entries across Kerala stores`);

    // 6. Seed Recent Sales Bills with Kerala Customer Names
    console.log('\n🧾 Generating sample retail bills at counters...');
    const keralaCustomers = [
      { name: 'Anandhu Krishnan', phone: '9447112233' },
      { name: 'Parvathy Nair', phone: '9447223344' },
      { name: 'Muhammed Asharaf', phone: '9847334455' },
      { name: 'Fathima Beevi', phone: '9446445566' },
      { name: 'George Varghese', phone: '9495556677' },
      { name: 'Sreedevi Namboothiri', phone: '9447667788' },
      { name: 'Vishnu Prasad', phone: '9446778899' },
      { name: 'Reshma Mohan', phone: '9847889900' },
      { name: 'Jithin Raj', phone: '9495990011' },
      { name: 'Anjana Kurian', phone: '9447001122' },
      { name: 'Sidharth Menon', phone: '9446123456' },
      { name: 'Lakshmi Priya', phone: '9847234567' },
    ];

    for (let i = 0; i < keralaCustomers.length; i++) {
      const cust = keralaCustomers[i];
      const branchCode = storeBranchCodes[i % storeBranchCodes.length];
      const branchId = branchMap.get(branchCode)!;
      const billDate = daysAgo(12 - i);
      const billNum = `${branchCode.replace('-', '')}-${formatDateKey(billDate)}-${String(i + 1).padStart(4, '0')}`;
      
      // Select 1 to 3 books for this bill
      const b1 = createdBooks[(i * 3) % createdBooks.length];
      const b2 = createdBooks[(i * 3 + 1) % createdBooks.length];
      const itemsToBuy = [
        { book: b1, qty: 1 },
        { book: b2, qty: (i % 2) + 1 }
      ];

      let subTotal = 0;
      let totalCost = 0;
      for (const it of itemsToBuy) {
        subTotal += it.book.price * it.qty;
        totalCost += it.book.costPrice * it.qty;
      }
      const discount = i % 3 === 0 ? 50 : 0;
      const totalAmount = subTotal - discount;
      const paymentMode = i % 2 === 0 ? 'UPI' : 'CASH';

      const billId = uuidv4();
      await qr.query(
        `INSERT INTO \`bill\` (
          \`id\`, \`bill_number\`, \`branch_id\`, \`exhibition_id\`, \`created_by_id\`,
          \`sub_total\`, \`discount\`, \`total_amount\`, \`total_cost\`,
          \`payment_status\`, \`payment_mode\`, \`status\`,
          \`customer_name\`, \`customer_phone\`, \`created_at\`, \`updated_at\`
        ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, 'PAID', ?, 'COMPLETED', ?, ?, ?, ?);`,
        [
          billId, billNum, branchId, adminId,
          subTotal, discount, totalAmount, totalCost,
          paymentMode, cust.name, cust.phone, billDate, billDate
        ]
      );

      // Bill items
      for (const it of itemsToBuy) {
        const lineTotal = it.book.price * it.qty;
        await qr.query(
          `INSERT INTO \`bill_item\` (\`id\`, \`bill_id\`, \`book_id\`, \`quantity\`, \`unit_price\`, \`unit_cost\`, \`line_total\`, \`created_at\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [uuidv4(), billId, it.book.id, it.qty, it.book.price, it.book.costPrice, lineTotal, billDate]
        );
      }
    }
    console.log(`  ✓ Generated ${keralaCustomers.length} counter sales bills`);

    // 7. Seed Sample Purchase Orders from Publishers
    console.log('\n📦 Creating realistic procurement purchase orders...');
    const supplierEntries = Array.from(supplierMap.entries());
    for (let i = 0; i < 3; i++) {
      const [suppName, suppId] = supplierEntries[i];
      const poNum = `PO-2026-${String(101 + i)}`;
      const poDate = daysAgo(20 - i * 5);
      const poId = uuidv4();
      
      const poBooks = [
        createdBooks[i * 4],
        createdBooks[i * 4 + 1],
        createdBooks[i * 4 + 2],
      ];
      let poTotal = 0;
      for (const b of poBooks) {
        poTotal += b.costPrice * 50;
      }

      await qr.query(
        `INSERT INTO \`purchase_order\` (\`id\`, \`order_number\`, \`supplier_id\`, \`status\`, \`expected_date\`, \`placed_by_id\`, \`total_cost\`, \`created_at\`, \`updated_at\`)
         VALUES (?, ?, ?, 'RECEIVED', ?, ?, ?, ?, ?);`,
        [poId, poNum, suppId, daysAgo(5), adminId, poTotal, poDate, poDate]
      );

      for (const b of poBooks) {
        await qr.query(
          `INSERT INTO \`purchase_order_item\` (\`id\`, \`purchase_order_id\`, \`book_id\`, \`quantity_ordered\`, \`quantity_received\`, \`unit_cost\`)
           VALUES (?, ?, ?, 50, 50, ?);`,
          [uuidv4(), poId, b.id, b.costPrice]
        );
      }
    }
    console.log('  ✓ Created 3 completed procurement purchase orders');

    // 8. Seed Sample Restock Requests from Branch Stores
    console.log('\n🔄 Creating branch restock requests...');
    const restockSample = [
      { branch: 'BR-01', status: 'PENDING', note: 'High footfall during festival season — urgent copies needed.' },
      { branch: 'BR-02', status: 'RECEIVED', note: 'Approved and dispatched from central warehouse.' },
      { branch: 'BR-03', status: 'APPROVED', note: 'Ready for delivery via internal transport.' },
    ];

    for (let i = 0; i < restockSample.length; i++) {
      const r = restockSample[i];
      const bId = branchMap.get(r.branch)!;
      const rId = uuidv4();
      const rDate = daysAgo(10 - i * 3);

      await qr.query(
        `INSERT INTO \`restock_request\` (\`id\`, \`branch_id\`, \`requested_by_id\`, \`status\`, \`reviewed_by_id\`, \`review_note\`, \`reviewed_at\`, \`created_at\`, \`updated_at\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [rId, bId, adminId, r.status, r.status !== 'PENDING' ? adminId : null, r.note, r.status !== 'PENDING' ? rDate : null, rDate, rDate]
      );

      // 2 books per request
      const reqBooks = [createdBooks[i * 3], createdBooks[i * 3 + 1]];
      for (const b of reqBooks) {
        await qr.query(
          `INSERT INTO \`restock_request_item\` (\`id\`, \`restock_request_id\`, \`book_id\`, \`quantity_requested\`, \`quantity_approved\`, \`quantity_received\`)
           VALUES (?, ?, ?, 25, ?, ?);`,
          [uuidv4(), rId, b.id, r.status === 'PENDING' ? 0 : 25, r.status === 'RECEIVED' ? 25 : 0]
        );
      }
    }
    console.log('  ✓ Seeded 3 realistic restock requests');

    // 9. Seed Exhibitions in Kerala
    console.log('\n🎪 Seeding literary exhibitions...');
    const exhibitions = [
      {
        name: 'Kochi International Book Festival 2026',
        location: 'Marine Drive Ground, Ernakulam, Kochi',
        sourceBranch: 'BR-01',
        status: 'ONGOING',
        startDate: daysAgo(2),
        endDate: daysAgo(-5), // ends in 5 days
      },
      {
        name: 'Kozhikode Beach Literature Festival 2026',
        location: 'Freedom Square, Kozhikode Beach',
        sourceBranch: 'BR-02',
        status: 'APPROVED',
        startDate: daysAgo(-10),
        endDate: daysAgo(-15),
      },
    ];

    for (const exh of exhibitions) {
      const exhId = uuidv4();
      const bId = branchMap.get(exh.sourceBranch)!;
      await qr.query(
        `INSERT INTO \`exhibition\` (\`id\`, \`name\`, \`location\`, \`source_branch_id\`, \`start_date\`, \`end_date\`, \`status\`, \`requested_by_id\`, \`approved_by_id\`, \`created_at\`, \`updated_at\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());`,
        [exhId, exh.name, exh.location, bId, exh.startDate, exh.endDate, exh.status, adminId, adminId]
      );

      // Exhibition stock (top Malayalam books taken to stall)
      for (let i = 0; i < 6; i++) {
        await qr.query(
          `INSERT INTO \`exhibition_stock\` (\`id\`, \`exhibition_id\`, \`book_id\`, \`quantity_taken\`, \`quantity_sold\`, \`quantity_returned\`, \`quantity_damaged\`, \`quantity_lost\`)
           VALUES (?, ?, ?, 30, ?, 0, 0, 0);`,
          [uuidv4(), exhId, createdBooks[i].id, exh.status === 'ONGOING' ? 12 : 0]
        );
      }
    }
    console.log('  ✓ Seeded 2 literary festival exhibitions with exhibition stock');

    // 10. Seed Customer Book Enquiries
    console.log('\n❓ Seeding customer book enquiries...');
    const enquiries = [
      { cust: 'Gokuldas', phone: '9447123987', bookIndex: 2, freeText: null, branch: 'BR-01' },
      { cust: 'Anupama S.', phone: '9847234876', bookIndex: 3, freeText: null, branch: 'BR-02' },
      { cust: 'Mathew Philip', phone: '9495345765', bookIndex: null, freeText: 'Hortus Malabaricus Malayalam Translation', branch: 'BR-03' },
      { cust: 'Vineeth Kumar', phone: '9446456654', bookIndex: 0, freeText: null, branch: 'BR-04' },
      { cust: 'Divya Unni', phone: '9447567543', bookIndex: null, freeText: 'Aithihyamala (Unabridged Illustrated Edition)', branch: 'BR-01' },
    ];

    for (const enq of enquiries) {
      const bId = branchMap.get(enq.branch)!;
      const targetBookId = enq.bookIndex !== null ? createdBooks[enq.bookIndex].id : null;
      await qr.query(
        `INSERT INTO \`book_enquiry\` (\`id\`, \`book_id\`, \`free_text_title\`, \`branch_id\`, \`logged_by_id\`, \`customer_name\`, \`customer_phone\`, \`status\`, \`created_at\`, \`updated_at\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', NOW(), NOW());`,
        [uuidv4(), targetBookId, enq.freeText, bId, adminId, enq.cust, enq.phone]
      );
    }
    console.log('  ✓ Seeded 5 customer book enquiries');

    // 11. Seed Branch Operational Expenses
    console.log('\n💰 Seeding branch operational expenses...');
    const expenses = [
      { branch: 'BR-01', category: 'RENT', amount: 35000, desc: 'Store monthly rent - Statue branch, Trivandrum' },
      { branch: 'BR-01', category: 'UTILITIES', amount: 6200, desc: 'KSEB Commercial Electricity bill' },
      { branch: 'BR-02', category: 'RENT', amount: 28000, desc: 'Store monthly rent - SM Street, Calicut' },
      { branch: 'BR-02', category: 'MAINTENANCE', amount: 3400, desc: 'Air conditioning service & lighting repair' },
      { branch: 'BR-03', category: 'RENT', amount: 24000, desc: 'Store monthly rent - Baker Junction, Kottayam' },
      { branch: 'BR-04', category: 'RENT', amount: 26000, desc: 'Store monthly rent - Round North, Thrissur' },
      { branch: null, category: 'MARKETING', amount: 15000, desc: 'Malayala Manorama & Mathrubhumi newspaper book festival ad' },
    ];

    for (let i = 0; i < expenses.length; i++) {
      const exp = expenses[i];
      const bId = exp.branch ? branchMap.get(exp.branch)! : null;
      await qr.query(
        `INSERT INTO \`expense\` (\`id\`, \`branch_id\`, \`category\`, \`amount\`, \`description\`, \`expense_date\`, \`entered_by_id\`, \`created_at\`, \`updated_at\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW());`,
        [uuidv4(), bId, exp.category, exp.amount, exp.desc, daysAgo(i * 3 + 2), adminId]
      );
    }
    console.log('  ✓ Seeded 7 realistic operational expenses');

    console.log('\n🎉 Malayalam Dummy Data Seed Completed Successfully!\n');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    await qr.release();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
