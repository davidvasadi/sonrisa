# jegyzeteim

nyers jegyzetek

## UX tudatosan kimaradt
a feladat a folyamatot értékeli, ezért az időt a döntésekre, az ellenőrzésre és a működő pipeline-ra fordítottam. a felület egy kész shadcn sablonra épül, és pontosan annyi, hogy minden funkció kipróbálható legyen.

## következő lépések
- a user és az admin felületet szétválasztanám: külön alkalmazás, az admin bejelentkezés mögött. most egy appban vannak, és az admin bárkinek nyitva van (csak helyi demó)
- UX: felhasználói folyamatok átgondolása, saját design a sablon helyett

## irányváltások
- az AI háromszor is visszahozta a minimum szinteket / határértékeket. mindig nemet mondtam: a forrás dönti el, mi fontos, ha egy forrás túl sokat küld, másik forrást választunk. D-018-ként lezártam
- a kategóriák nem fixek, abból jönnek, amit a források ténylegesen adnak
- tőzsde külön forrásként kiesett, nincs kulcs nélküli esemény-feed, a BBC gazdasági rovata lefedi
- node 22-re kellett váltani, mert a better-sqlite3 node 20-on natív fordítást igényel
- a "connect slack" gomb kötelező lett, nem opcionális

## amiket elkaptam
- az első promptot "verbatim"-nak nevezte, de kivágta belőle a feladatszöveget → R-001
- a skillben disable-model-invocation volt, így az "y" soha nem indíthatta volna el → R-005
- ahol nem adtam indoklást, az AI kitalált egyet. megjelölte AI-inferred-ként, én átnéztem és jóváhagytam


