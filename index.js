//index.js
 
const express = require("express");
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const sass = require('sass');
const ejs = require('ejs');

const Client = require('pg').Client;


var client = new Client({
    database: "cti_2024",
    user: "george",
    password: "george",
    host: "localhost",
    port: 5432
});
client.connect();

client.query("select * from produse", function (err, rez) {
    console.log(rez);
})

let vect_foldere = ["temp", "temp1"]; // Use const for immutable variables
for (let folder of vect_foldere) {
    let caleFolder = path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder);
    }
}


const obGlobal = { // Define obGlobal with const to avoid global scope pollution
    obErori: null,
    obImagini: null,
    folderCss: path.join(__dirname, "resurse/css"),
    folderScss: path.join(__dirname, "resurse/scss"),
    folderBackup: path.join(__dirname, "backup"),


};

 vect_foldere = ["temp", "temp1", "backup"]
for (let folder of vect_foldere) {
    let caleFolder = path.join(__dirname, folder)
    if(!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder);
    }
}



const app = express(); // Use const for app as its reference should not change
console.log("Folder proiect", __dirname);
console.log("Cale fisier", __filename);
console.log("Director de lucru", process.cwd());

app.set("view engine", "ejs");

app.use("/resurse", express.static(path.join(__dirname+"/resurse"))); // Use path.join for consistency
app.use("/node_modules", express.static(__dirname + "/node_modules"));

app.get(["/", "/index", "/home"], function (req, res) {
    res.render("pagini/index", { ip: req.ip,imagini:obGlobal.obImagini.imagini });
});

app.get("/produse", function (req, res) {
    console.log(req.query)
    client.query("select * from produse", function (err, rez) {
        if (err) {
            console.log(err);
            afisareEroare(res, 2);
        }
        else {
            res.render("pagini/produse", { produse: rez.rows, optiuni: [] })
        }

    })
})


app.get("/produs/:id", function (req, res) {
    const query = {
        text: 'SELECT * FROM produse WHERE id = $1',
        values: [req.params.id],
    };

    client.query(query, function (err, rez) {
        if (err) {
            console.log(err);
            afisareEroare(res, 500);
        } else {
            if (rez.rows.length === 0) {
                afisareEroare(res, 404, 'Produsul nu a fost găsit', 'Produsul căutat nu există în baza de date.');
            } else {
                res.render("pagini/produs", { prod: rez.rows[0] });
            }
        }
    });
});





app.get("/cerere", function (req, res) {
    res.send("<b>Hello</b> <span style='color:red'>world!</span>");
});

app.get("/data", function (req, res, next) {
    res.write("Data: ");
    next();
});
app.get("/data", function (req, res) {
    res.end("" + new Date());
});

app.get("/suma/:a/:b", function (req, res) {
    var suma = parseInt(req.params.a) + parseInt(req.params.b);
    res.send("" + suma);
});

app.get("/favicon", function (req, res) {
    res.sendFile(path.join(__dirname, "resurse/favicon/favicon"));
});

app.get(new RegExp("^\/[a-z0-9A-Z]*\/$"), function (req, res) {
    afisareEroare(res, 403);
});
app.get("/*.ejs", function (req, res) {
    afisareEroare(res, 400);
});

app.get("/*", function (req, res) {
    console.log(req.url);
    try {
        res.render("pagini" + req.url, function (err, rezHtml) {
            if (err) {
                if (err.message.includes("Failed to lookup view")) {
                    afisareEroare(res, 404);
                    console.log("Nu a gasit pagina: ", req.url);
                }
                return; // Prevent further execution
            }
            res.send(rezHtml);
        });
    } catch (err) {
        afisareEroare(res, 500); // Use a general error code in case of unexpected errors
        console.log("Eroare la render: ", err.message);
    }
});

function initErori() {
    var continut = fs.readFileSync(path.join(__dirname, "resurse/json/erori.json")).toString("utf-8");
    obGlobal.obErori = JSON.parse(continut);
    for (let eroare of obGlobal.obErori.info_erori) {
        eroare.imagine = path.join(__dirname, eroare.imagine); // Correct path joining
    }
    obGlobal.obErori.eroare_default.imagine = path.join(__dirname, obGlobal.obErori.eroare_default.imagine);
}
initErori();

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find(elem => elem.identificator == identificator);
    if (!eroare) {
        eroare = obGlobal.obErori.eroare_default; // Fallback to default error if specific error not found
    }
    res.status(eroare.identificator || 500).render("pagini/eroare", { // Provide default status code
        titlu: titlu || eroare.titlu,
        text: text || eroare.text,
        imagine: imagine || eroare.imagine,
    });
}


function initImagini() {
    var continut = fs.readFileSync(path.join(__dirname, "resurse/json/galerie.json")).toString("utf-8");

    obGlobal.obImagini = JSON.parse(continut);
    let vImagini=obGlobal.obImagini.imagini;

    let caleAbs = path.join(__dirname, obGlobal.obImagini.cale_galerie);
    let caleAbsMediu = path.join(__dirname, obGlobal.obImagini.cale_galerie, "mediu");
    if (!fs.existsSync(caleAbsMediu))
        fs.mkdirSync(caleAbsMediu);
    //for (let i=0; i< vErori.length; i++ )
    for (let imag of vImagini) {
        [numeFis, ext] = imag.fisier.split(".");
        let caleFisAbs = path.join(caleAbs, imag.fisier);
        let caleFisMediuAbs=path.join(caleAbsMediu, numeFis + ".webp");
        sharp(caleFisAbs).resize(300).toFile(caleFisMediuAbs);
        imag.fisier_mediu = path.join("/", obGlobal.obImagini.cale_galerie, "mediu", numeFis + ".webp")
        imag.fisier = path.join("/", obGlobal.obImagini.cale_galerie, imag.fisier)

    }
    
}
initImagini();



function compileazaScss(caleScss, caleCss) {
    console.log("cale", caleCss);
    if (!caleCss) {
        let [numeFis, ext] = path.basename(caleScss).split("."); // Extrage numele fișierului și extensia
        caleCss = numeFis + ".css";
    }

    if (!path.isAbsolute(caleScss))
        caleScss = path.join(obGlobal.folderScss, caleScss);
    if (!path.isAbsolute(caleCss))
        caleCss = path.join(obGlobal.folderCss, caleCss);

    let caleBackup = path.join(obGlobal.folderBackup, "resurse/css");
    if (!fs.existsSync(caleBackup)) {
        fs.mkdirSync(caleBackup, { recursive: true });
    }

    let numeFisCss = path.basename(caleCss);
    if (fs.existsSync(caleCss)) {
        fs.copyFileSync(caleCss, path.join(obGlobal.folderBackup, "resurse/css", numeFisCss));
    }
    // Compilează fișierul SCSS și scrie CSS-ul rezultat în fișierul CSS
    let rez = sass.renderSync({
        file: caleScss,
        outFile: caleCss,
        sourceMap: true
    });
    fs.writeFileSync(caleCss, rez.css.toString());
    //console.log("Compilare SCSS",rez);
}

//compileazaScss("a.scss");
let vFisiere = fs.readdirSync(obGlobal.folderScss);
for (let numeFis of vFisiere) {
    if (path.extname(numeFis) == ".scss") {
        compileazaScss(numeFis);
    }
}

fs.watch(obGlobal.folderScss, { recursive: true }, function (eveniment, numeFis) {
    console.log(eveniment, numeFis);
    if (eveniment == "change" || eveniment == "rename") {
        let caleCompleta = path.join(obGlobal.folderScss, numeFis);
        if (fs.existsSync(caleCompleta) && path.extname(numeFis) == ".scss") {
            compileazaScss(caleCompleta);
        }
    }
});









app.listen(8080, () => console.log("Serverul a pornit pe portul 8080"));
