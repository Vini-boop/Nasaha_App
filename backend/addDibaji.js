const fs = require('fs');
const path = require('path');

const input = `Heri kukosa upate, Kuliko kupata ukose.
Inapulizwa ili iwake, pia inapulizwa ili iweze kuzima, chaguo ni lako.
Bora wali nyama, kuliko walimwengu eehh wana maneno Hao.
Tujiepushe na makofi ya sifa, maana yanatusahaulisha ndoto zetu.
Moyo... unaongea cha ajabu hautoi sauti.
Chozi ni kiwakilishi cha maneno ambayo moyo hayawezi kuongea.
Mtoto ni mtu mzima anayekua na mtu mzima ni mtoto aliyekua.
Kila siku maisha yanatupa shule mpya, hupaswi kuwa maskini kiasi ambacho kitu pekee ulicho nacho ni pesa tu.
Mtu hivyo umwonavyo, sivyo alivyo.
Heri kuchafuka ukiwa umeshiba, kuliko kuwa msafi ukiwa na njaa.
Maisha hayana usawa, ndio maana kuna aliye nacho na asiye nacho.
Leo ina mimba, hatujui itazaa nini wanetu.
Baraka zinapenda kukutana na jasho, kuliko usingizi.
Pambana kwa tahadhari, maana mapambano yote ni hatari.
Hakuna vita vitamu, vita vyote ni vichungu.
Unyonge si dawa, yatupasa tusimame tukapambane.
Katika pesa hupaswi kumwamini yeyote, hata akiwa ni ndugu wa karibu.
Unaposhika nyundo, usidhani kila kitu ni msumari.
Kuvuka mto, sio mwisho wa safari.
Uongozi ni vazi la kuazima, ambalo muda wowote linarudi kwenye kabati la mwenyewe.
Tusiwaamini binadamu (Yeremiah 17:5,6) maana amekisha kulaaniwa atakaye mtegemea mwanadamu. Bali tumwamini na kumtegemea Mungu (Yeremiah 17:7,8).
Sehemu tunazo amini kwamba mafanikio yetu yatakua, Mungu katupangia kwingine.
Wengine wetu tunamshtakia Mungu mnayotufanyia sisi. Mungu si Athumani.
Wanangu eeh, Mungu wao ni Mungu wetu, hajabadilika, hajabadili mipango, ni yule yule.
Sisi tunapanga Mungu anaamua.
Usimwambie Mungu ukubwa wa shida zako, ila ziambie shida zako ukubwa wa Mungu wako.
Tusikate tamaa wanetu eeehh, kitabu cha riziki yetu kina kurasa za kheri.
Wanetu eeh! Nashtuka sana nikiona jinsi mnavyong'ang'ana kuwarithisha hawa viumbe ambao ni wateja wa waganga watapeli.
Ujana una mateso, tukwepe mishale mingi na tuvumilie.
Wanetu, tutamani sana mafanikio, wala si Utajiri.
Wanetu Eeeh tusiwe wanasiasa kivyovyote vile, Maana uongo unaokithiri eneo hilo ni mkubwa mno.
Wanetu Eeeh, tusithubutu kusoma gazeti nyakati za jioni.
Wanetu tuwe na heshima, Maana itatufusha kwingi ata kule tunako amini hela zitatufusha.
Vijana wenzangu tuwe mabalozi wema, mnakoenda kwa chochote kile mnachohusishwa.
Rafiki mkubwa wa Umaskini ni Usingizi; wanetu tumkimbie huyu rafiki maana huyu si rafiki mzuri.
Kwa mwanaume hakuna urafiki na mwanamke, najua kuna wengi hawatakubaliana na mimi lakini huu ndo ukweli.
Ukishindwa kumbadilisha mwanamke, badilisha mwanamke.
Usilazimishe asikulazimishe moyo sio mashine, moyo sukuma damu.
Binadamu ni wepesi sana kusahau wema wako, ishi nao kwa tahadhari.
Anayekununua leo, kesho anaweza kukuuza.
Usaliti unatoka kwa watu wa karibu sana.
Mwavuli huonekana kuwa mzigo baada ya mvua kuisha.
Unapoteza sehemu ndogo ya uaminifu, huwezi kuaminiwa tena hata kidogo!
Wanetu eeh, tusiwakabidhi binadamu nafasi ya Mungu, binadamu hawa watawashangaza!
Wanetu tusiishi kwenye maisha ya kuigiza, tuishi maisha ya uhalisia.
Urafiki pesa, uadui pesa.`;

const lines = input.split('\n').map(l => l.trim()).filter(l => l.length > 0);

const filePath = path.join(__dirname, 'data', 'dibaji.json');
let dibaji = [];

try {
  dibaji = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (e) {
  console.log("Error reading dibaji.json", e);
}

// Find max id
let maxId = 0;
dibaji.forEach(d => {
  const idNum = parseInt(d.id, 10);
  if (idNum > maxId) maxId = idNum;
});

// Let's create an array of new objects, starting with maxId + 1
let currentId = maxId + 1;
// we'll start their created at today
let baseDate = new Date();

lines.forEach((line, index) => {
  const dateStr = new Date(baseDate.getTime() + (index * 86400000)).toISOString();
  dibaji.push({
    id: currentId.toString(),
    text: line,
    meaning: "Tafakari kwa kina kuhusu msemo huu. Una ujumbe mzito kwa maisha yetu ya kila siku.",
    source: "Wachangiaji wa Mawazo",
    enText: "",
    enMeaning: "",
    createdAt: dateStr
  });
  currentId++;
});

fs.writeFileSync(filePath, JSON.stringify(dibaji, null, 2), 'utf8');
console.log(`Added ${lines.length} new dibaji. Total is now ${dibaji.length}`);
