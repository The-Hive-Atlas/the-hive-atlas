/* The Hive Atlas: the "U.S. Trends" tab on the NASS pages. These NASS series exist for the United States only,
   so they are drawn as charts over time instead of state rows. Reads window.HIVE_NATIONAL (data/nass-national.js).
   losses.html: sudden colony loss, small operations.  honey-production.html: income sources, prices by color, parity. */
(function () {
  var host = document.getElementById('tx-view'), N8 = window.HIVE_NATIONAL;
  if (!host || !N8) return;
  var SRC = host.getAttribute('data-source');
  var I = window.I18N || { lang: 'en', T: function (s) { return s; }, N: function (x, d) { return Number(x).toFixed(d || 0); }, PCT: function (x, d) { return Number(x).toFixed(d || 0) + '%'; } };
  var LANG = I.lang, BASE = N8.source.cpiBaseYear;

  var TX = {
    fr: {
      'In {y} dollars': 'En dollars de {y}', 'As reported': 'Tels que publiés', 'Prices and values': 'Prix et valeurs', 'Sales': 'Ventes', 'All sales': 'Toutes les ventes', 'Retail': 'Détail', 'Wholesale': 'Gros',
      'Show': 'Afficher', 'Colonies': 'Colonies', 'Share of all colonies lost': 'Part de toutes les colonies perdues',
      'Income from Honey, Pollination, and Other Hive Products': 'Revenus du miel, de la pollinisation et des autres produits de la ruche',
      'Honey': 'Miel', 'Pollination': 'Pollinisation', 'Other hive products': 'Autres produits de la ruche', 'million $': 'millions de $',
      'In {y}, beekeepers earned {p} from pollination, {r} of the {h} their honey was worth.': 'En {y}, les apiculteurs ont tiré {p} de la pollinisation, soit {r} des {h} que valait leur miel.',
      'Operations with five or more colonies. NASS has reported pollination and other income only since 2015, for the United States as a whole. Other hive products are everything but honey and pollination, such as beeswax, queens, and package bees.': 'Exploitations de cinq colonies ou plus. La NASS ne publie les revenus de la pollinisation et des autres produits que depuis 2015, pour l’ensemble des États-Unis. Les autres produits de la ruche regroupent tout sauf le miel et la pollinisation : cire, reines, paquets d’abeilles, etc.',
      'Honey Prices by Color': 'Prix du miel selon la couleur', 'Water white to white': 'Blanc eau à blanc', 'Extra light amber': 'Ambre extra clair', 'Light amber to dark amber': 'Ambre clair à ambre foncé', 'Specialty and other honeys': 'Miels de spécialité et autres', '$ per lb': '$ par livre',
      'In {y}, {c} honey sold for {v} a pound and {c2} honey for {v2}.': 'En {y}, le miel « {c} » s’est vendu {v} la livre et le miel « {c2} », {v2}.',
      'Price received by beekeepers. Retail is honey they sold to consumers and stores; wholesale is honey sold in bulk to packers and processors. NASS reported color classes from 2003, in cents per pound until 2017.': 'Prix reçu par les apiculteurs. Le détail correspond au miel vendu aux consommateurs et aux magasins ; le gros au miel vendu en vrac aux conditionneurs et transformateurs. La NASS publie les classes de couleur depuis 2003, en cents par livre jusqu’en 2017.',
      'Honey Price as a Share of Parity': 'Prix du miel en pourcentage de la parité', 'Percent of parity': 'Pourcentage de la parité', '% of parity': '% de la parité',
      'In {m}, honey sold at {v} of parity, so a pound of honey bought about {f} of what it did in 1910–1914, measured against what farmers pay.': 'En {m}, le miel se vendait à {v} de la parité : une livre de miel achetait environ {f} de ce qu’elle achetait en 1910–1914, au regard de ce que paient les agriculteurs.',
      'Parity is the price honey would need today to buy as much, relative to what farmers pay for goods, services, interest, taxes and wages, as it did in 1910–1914. NASS publishes it monthly for the United States.': 'La parité est le prix qu’il faudrait aujourd’hui au miel pour avoir le même pouvoir d’achat qu’en 1910–1914, au regard de ce que paient les agriculteurs (biens, services, intérêts, impôts, salaires). La NASS la publie chaque mois pour les États-Unis.',
      'Sudden Colony Loss': 'Perte soudaine de colonies', 'Colonies lost': 'Colonies perdues',
      'In {q}, {n} colonies were lost suddenly, {s} of all colonies lost that quarter.': 'En {q}, {n} colonies ont été perdues soudainement, soit {s} de toutes les colonies perdues ce trimestre.',
      'Colonies beekeepers reported lost with all of these signs: few or no dead bees in or near the hive; a quick loss of adult bees although the queen, capped brood and food were still there; robbing of the food absent or delayed; and a loss not explained by Varroa or Nosema. Reported by beekeepers, not confirmed in a lab. U.S. only; no data for April–June 2019.': 'Colonies déclarées perdues avec tous ces signes : peu ou pas d’abeilles mortes dans la ruche ou à proximité ; une perte rapide des abeilles adultes alors que la reine, le couvain operculé et les réserves étaient encore là ; pillage des réserves absent ou tardif ; perte non expliquée par Varroa ou Nosema. Déclaré par les apiculteurs, non confirmé en laboratoire. États-Unis seulement ; pas de données pour avril–juin 2019.',
      'Small Beekeeping Operations, 2015–2017': 'Petites exploitations apicoles, 2015–2017', 'Fewer than 5 colonies': 'Moins de 5 colonies', '5 or more colonies': '5 colonies ou plus', 'Percent of colonies lost': 'Pourcentage de colonies perdues', '% of colonies': '% des colonies',
      'Operations with fewer than five colonies lost {a} of their colonies per quarter on average, against {b} for operations with five or more.': 'Les exploitations de moins de cinq colonies ont perdu en moyenne {a} de leurs colonies par trimestre, contre {b} pour celles de cinq colonies ou plus.',
      'NASS surveyed operations with fewer than five colonies only from 2015 to 2017, for the United States as a whole. They held about 40,000 to 52,000 colonies.': 'La NASS n’a enquêté sur les exploitations de moins de cinq colonies que de 2015 à 2017, pour l’ensemble des États-Unis. Elles comptaient environ 40 000 à 52 000 colonies.',
      'These NASS series exist only for the United States as a whole, so they are shown over time rather than by state.': 'Ces séries de la NASS n’existent que pour l’ensemble des États-Unis : elles sont donc présentées dans le temps plutôt que par État.',
      'All U.S. series (CSV)': 'Toutes les séries des É.-U. (CSV)', 'Download': 'Télécharger', 'Chart': 'Graphique', 'Table': 'Tableau', 'Year': 'Année', 'Quarter': 'Trimestre', 'Month': 'Mois',
      'Jan–Mar': 'janv.–mars', 'Apr–Jun': 'avr.–juin', 'Jul–Sep': 'juil.–sept.', 'Oct–Dec': 'oct.–déc.'
    },
    es: {
      'In {y} dollars': 'En dólares de {y}', 'As reported': 'Tal como se publicaron', 'Prices and values': 'Precios y valores', 'Sales': 'Ventas', 'All sales': 'Todas las ventas', 'Retail': 'Minorista', 'Wholesale': 'Mayorista',
      'Show': 'Mostrar', 'Colonies': 'Colonias', 'Share of all colonies lost': 'Proporción de todas las colonias perdidas',
      'Income from Honey, Pollination, and Other Hive Products': 'Ingresos por miel, polinización y otros productos de la colmena',
      'Honey': 'Miel', 'Pollination': 'Polinización', 'Other hive products': 'Otros productos de la colmena', 'million $': 'millones de $',
      'In {y}, beekeepers earned {p} from pollination, {r} of the {h} their honey was worth.': 'En {y}, los apicultores obtuvieron {p} por polinización, el {r} de los {h} que valió su miel.',
      'Operations with five or more colonies. NASS has reported pollination and other income only since 2015, for the United States as a whole. Other hive products are everything but honey and pollination, such as beeswax, queens, and package bees.': 'Explotaciones con cinco o más colonias. NASS publica los ingresos por polinización y otros productos solo desde 2015 y para EE. UU. en conjunto. Otros productos de la colmena son todo salvo la miel y la polinización: cera, reinas, paquetes de abejas, etc.',
      'Honey Prices by Color': 'Precios de la miel por color', 'Water white to white': 'Blanco agua a blanco', 'Extra light amber': 'Ámbar extra claro', 'Light amber to dark amber': 'Ámbar claro a ámbar oscuro', 'Specialty and other honeys': 'Mieles especiales y otras', '$ per lb': '$ por libra',
      'In {y}, {c} honey sold for {v} a pound and {c2} honey for {v2}.': 'En {y}, la miel «{c}» se vendió a {v} la libra y la miel «{c2}», a {v2}.',
      'Price received by beekeepers. Retail is honey they sold to consumers and stores; wholesale is honey sold in bulk to packers and processors. NASS reported color classes from 2003, in cents per pound until 2017.': 'Precio recibido por los apicultores. Minorista es la miel vendida a consumidores y tiendas; mayorista, la vendida a granel a envasadores y procesadores. NASS publica las clases de color desde 2003, en centavos por libra hasta 2017.',
      'Honey Price as a Share of Parity': 'Precio de la miel como porcentaje de paridad', 'Percent of parity': 'Porcentaje de paridad', '% of parity': '% de paridad',
      'In {m}, honey sold at {v} of parity, so a pound of honey bought about {f} of what it did in 1910–1914, measured against what farmers pay.': 'En {m}, la miel se vendió al {v} de paridad: una libra de miel compraba cerca de {f} de lo que compraba en 1910–1914, frente a lo que pagan los agricultores.',
      'Parity is the price honey would need today to buy as much, relative to what farmers pay for goods, services, interest, taxes and wages, as it did in 1910–1914. NASS publishes it monthly for the United States.': 'La paridad es el precio que necesitaría hoy la miel para comprar lo mismo que en 1910–1914, frente a lo que pagan los agricultores por bienes, servicios, intereses, impuestos y salarios. NASS la publica cada mes para EE. UU.',
      'Sudden Colony Loss': 'Pérdida repentina de colonias', 'Colonies lost': 'Colonias perdidas',
      'In {q}, {n} colonies were lost suddenly, {s} of all colonies lost that quarter.': 'En {q} se perdieron de repente {n} colonias, el {s} de todas las colonias perdidas en ese trimestre.',
      'Colonies beekeepers reported lost with all of these signs: few or no dead bees in or near the hive; a quick loss of adult bees although the queen, capped brood and food were still there; robbing of the food absent or delayed; and a loss not explained by Varroa or Nosema. Reported by beekeepers, not confirmed in a lab. U.S. only; no data for April–June 2019.': 'Colonias declaradas perdidas con todas estas señales: pocas o ninguna abeja muerta en la colmena o cerca; pérdida rápida de abejas adultas aunque la reina, la cría operculada y el alimento seguían allí; pillaje del alimento ausente o tardío; y una pérdida no explicada por Varroa ni Nosema. Declarado por los apicultores, sin confirmación de laboratorio. Solo EE. UU.; sin datos para abril–junio de 2019.',
      'Small Beekeeping Operations, 2015–2017': 'Explotaciones apícolas pequeñas, 2015–2017', 'Fewer than 5 colonies': 'Menos de 5 colonias', '5 or more colonies': '5 colonias o más', 'Percent of colonies lost': 'Porcentaje de colonias perdidas', '% of colonies': '% de las colonias',
      'Operations with fewer than five colonies lost {a} of their colonies per quarter on average, against {b} for operations with five or more.': 'Las explotaciones con menos de cinco colonias perdieron en promedio el {a} de sus colonias por trimestre, frente al {b} de las de cinco o más.',
      'NASS surveyed operations with fewer than five colonies only from 2015 to 2017, for the United States as a whole. They held about 40,000 to 52,000 colonies.': 'NASS solo encuestó a las explotaciones con menos de cinco colonias de 2015 a 2017 y para EE. UU. en conjunto. Tenían entre 40.000 y 52.000 colonias.',
      'These NASS series exist only for the United States as a whole, so they are shown over time rather than by state.': 'Estas series de NASS solo existen para EE. UU. en conjunto, por eso se muestran en el tiempo y no por estado.',
      'All U.S. series (CSV)': 'Todas las series de EE. UU. (CSV)', 'Download': 'Descargar', 'Chart': 'Gráfico', 'Table': 'Tabla', 'Year': 'Año', 'Quarter': 'Trimestre', 'Month': 'Mes',
      'Jan–Mar': 'ene–mar', 'Apr–Jun': 'abr–jun', 'Jul–Sep': 'jul–sep', 'Oct–Dec': 'oct–dic'
    },
    zh: {
      'In {y} dollars': '按 {y} 年美元计',
      'As reported': '按公布值',
      'Prices and values': '价格和产值',
      'Sales': '销售',
      'All sales': '所有销售',
      'Retail': '零售',
      'Wholesale': '批发',
      'Show': '显示',
      'Colonies': '蜂群',
      'Share of all colonies lost': '占全部损失蜂群的比例',
      'Income from Honey, Pollination, and Other Hive Products': '来自蜂蜜、授粉和其他蜂产品的收入',
      'Honey': '蜂蜜',
      'Pollination': '授粉',
      'Other hive products': '其他蜂产品',
      'million $': '百万美元',
      'In {y}, beekeepers earned {p} from pollination, {r} of the {h} their honey was worth.': '{y} 年，养蜂人从授粉中获得 {p}，相当于其蜂蜜产值 {h} 的 {r}。',
      'Operations with five or more colonies. NASS has reported pollination and other income only since 2015, for the United States as a whole. Other hive products are everything but honey and pollination, such as beeswax, queens, and package bees.': '拥有五群及以上的经营户。NASS 自 2015 年起才公布授粉和其他收入，且只有全美数据。其他蜂产品指蜂蜜和授粉以外的一切，例如蜂蜡、蜂王和笼蜂。',
      'Honey Prices by Color': '按颜色分的蜂蜜价格',
      'Water white to white': '水白至白色',
      'Extra light amber': '特浅琥珀色',
      'Light amber to dark amber': '浅琥珀色至深琥珀色',
      'Specialty and other honeys': '特色蜜及其他',
      '$ per lb': '美元/磅',
      'In {y}, {c} honey sold for {v} a pound and {c2} honey for {v2}.': '{y} 年，{c}蜂蜜每磅售价 {v}，{c2}蜂蜜为 {v2}。',
      'Price received by beekeepers. Retail is honey they sold to consumers and stores; wholesale is honey sold in bulk to packers and processors. NASS reported color classes from 2003, in cents per pound until 2017.': '养蜂人收到的价格。零售是卖给消费者和商店的蜂蜜；批发是散装卖给包装商和加工商的蜂蜜。NASS 自 2003 年起公布颜色等级，2017 年以前以美分/磅计。',
      'Honey Price as a Share of Parity': '蜂蜜价格占平价的比例',
      'Percent of parity': '平价百分比',
      '% of parity': '平价百分比',
      'In {m}, honey sold at {v} of parity, so a pound of honey bought about {f} of what it did in 1910–1914, measured against what farmers pay.': '{m}，蜂蜜售价为平价的 {v}，即按农民支付的成本衡量，一磅蜂蜜的购买力约为 1910–1914 年的 {f}。',
      'Parity is the price honey would need today to buy as much, relative to what farmers pay for goods, services, interest, taxes and wages, as it did in 1910–1914. NASS publishes it monthly for the United States.': '平价是指相对于农民为商品、服务、利息、税收和工资支付的费用，蜂蜜如今要达到 1910–1914 年同等购买力所需的价格。NASS 每月公布全美数据。',
      'Sudden Colony Loss': '突发性蜂群损失',
      'Colonies lost': '损失蜂群',
      'In {q}, {n} colonies were lost suddenly, {s} of all colonies lost that quarter.': '{q}，有 {n} 群蜂突然损失，占当季度全部损失蜂群的 {s}。',
      'Colonies beekeepers reported lost with all of these signs: few or no dead bees in or near the hive; a quick loss of adult bees although the queen, capped brood and food were still there; robbing of the food absent or delayed; and a loss not explained by Varroa or Nosema. Reported by beekeepers, not confirmed in a lab. U.S. only; no data for April–June 2019.': '养蜂人报告的同时具有以下所有迹象的损失蜂群：蜂箱内或附近很少或没有死蜂；尽管蜂王、封盖子脾和食物仍在，成年蜂却迅速减少；食物没有被盗或被盗延迟；损失不能用瓦螨或微孢子虫解释。由养蜂人报告，未经实验室确认。仅限美国；2019 年 4–6 月无数据。',
      'Small Beekeeping Operations, 2015–2017': '小型养蜂经营户，2015–2017',
      'Fewer than 5 colonies': '少于 5 群',
      '5 or more colonies': '5 群及以上',
      'Percent of colonies lost': '蜂群损失百分比',
      '% of colonies': '蜂群百分比',
      'Operations with fewer than five colonies lost {a} of their colonies per quarter on average, against {b} for operations with five or more.': '少于五群的经营户平均每季度损失 {a} 的蜂群，而五群及以上的经营户为 {b}。',
      'NASS surveyed operations with fewer than five colonies only from 2015 to 2017, for the United States as a whole. They held about 40,000 to 52,000 colonies.': 'NASS 仅在 2015 至 2017 年调查过少于五群的经营户，且只有全美数据。这些经营户约有 40,000 至 52,000 群蜂。',
      'These NASS series exist only for the United States as a whole, so they are shown over time rather than by state.': '这些 NASS 系列只有全美数据，因此按时间而非按州显示。',
      'All U.S. series (CSV)': '所有美国系列（CSV）',
      'Download': '下载',
      'Chart': '图表',
      'Table': '表格',
      'Year': '年份',
      'Quarter': '季度',
      'Month': '月份',
      'Jan–Mar': '1–3月',
      'Apr–Jun': '4–6月',
      'Jul–Sep': '7–9月',
      'Oct–Dec': '10–12月'
    },
    ar: {
      'In {y} dollars': 'بدولارات {y}', 'As reported': 'كما نُشرت', 'Prices and values': 'الأسعار والقيم', 'Sales': 'المبيعات', 'All sales': 'كل المبيعات', 'Retail': 'التجزئة', 'Wholesale': 'الجملة',
      'Show': 'العرض', 'Colonies': 'الطوائف', 'Share of all colonies lost': 'النسبة من كل الطوائف المفقودة',
      'Income from Honey, Pollination, and Other Hive Products': 'الدخل من العسل والتلقيح ومنتجات الخلية الأخرى',
      'Honey': 'العسل', 'Pollination': 'التلقيح', 'Other hive products': 'منتجات الخلية الأخرى', 'million $': 'مليون دولار',
      'In {y}, beekeepers earned {p} from pollination, {r} of the {h} their honey was worth.': 'في {y} جنى النحالون {p} من التلقيح، أي {r} من {h} هي قيمة عسلهم.',
      'Operations with five or more colonies. NASS has reported pollination and other income only since 2015, for the United States as a whole. Other hive products are everything but honey and pollination, such as beeswax, queens, and package bees.': 'المناحل التي تضم خمس طوائف أو أكثر. لا تنشر NASS دخل التلقيح والمنتجات الأخرى إلا منذ 2015 وللولايات المتحدة ككل. ومنتجات الخلية الأخرى هي كل ما عدا العسل والتلقيح، مثل الشمع والملكات وطرود النحل.',
      'Honey Prices by Color': 'أسعار العسل حسب اللون', 'Water white to white': 'من الأبيض المائي إلى الأبيض', 'Extra light amber': 'كهرماني فاتح جدًا', 'Light amber to dark amber': 'من الكهرماني الفاتح إلى الداكن', 'Specialty and other honeys': 'أعسال خاصة وأخرى', '$ per lb': 'دولار لكل رطل',
      'In {y}, {c} honey sold for {v} a pound and {c2} honey for {v2}.': 'في {y} بيع عسل «{c}» بسعر {v} للرطل، وعسل «{c2}» بسعر {v2}.',
      'Price received by beekeepers. Retail is honey they sold to consumers and stores; wholesale is honey sold in bulk to packers and processors. NASS reported color classes from 2003, in cents per pound until 2017.': 'السعر الذي تلقاه النحالون. التجزئة هي العسل المبيع للمستهلكين والمتاجر، والجملة هي العسل المبيع بكميات كبيرة للمعبئين والمصنعين. تنشر NASS فئات اللون منذ 2003، بالسنت لكل رطل حتى 2017.',
      'Honey Price as a Share of Parity': 'سعر العسل كنسبة من سعر التعادل', 'Percent of parity': 'النسبة من سعر التعادل', '% of parity': '% من التعادل',
      'In {m}, honey sold at {v} of parity, so a pound of honey bought about {f} of what it did in 1910–1914, measured against what farmers pay.': 'في {m} بيع العسل بنسبة {v} من سعر التعادل، أي إن رطل العسل كان يشتري نحو {f} مما كان يشتريه في 1910–1914 قياسًا على ما يدفعه المزارعون.',
      'Parity is the price honey would need today to buy as much, relative to what farmers pay for goods, services, interest, taxes and wages, as it did in 1910–1914. NASS publishes it monthly for the United States.': 'سعر التعادل هو السعر الذي يحتاجه العسل اليوم ليشتري القدر نفسه الذي كان يشتريه في 1910–1914، قياسًا على ما يدفعه المزارعون للسلع والخدمات والفوائد والضرائب والأجور. وتنشره NASS شهريًا للولايات المتحدة.',
      'Sudden Colony Loss': 'الفقد المفاجئ للطوائف', 'Colonies lost': 'الطوائف المفقودة',
      'In {q}, {n} colonies were lost suddenly, {s} of all colonies lost that quarter.': 'في {q} فُقدت {n} طائفة فجأة، أي {s} من كل الطوائف المفقودة في ذلك الربع.',
      'Colonies beekeepers reported lost with all of these signs: few or no dead bees in or near the hive; a quick loss of adult bees although the queen, capped brood and food were still there; robbing of the food absent or delayed; and a loss not explained by Varroa or Nosema. Reported by beekeepers, not confirmed in a lab. U.S. only; no data for April–June 2019.': 'طوائف أفاد النحالون بفقدها مع كل هذه العلامات: قلة النحل الميت أو انعدامه داخل الخلية أو قربها؛ فقدان سريع للنحل البالغ رغم بقاء الملكة والحضنة المختومة والغذاء؛ غياب سرقة الغذاء أو تأخرها؛ وفقد لا تفسره الفاروا ولا النوزيما. بلاغات من النحالين غير مؤكدة مخبريًا. للولايات المتحدة فقط؛ لا بيانات لأبريل–يونيو 2019.',
      'Small Beekeeping Operations, 2015–2017': 'المناحل الصغيرة، 2015–2017', 'Fewer than 5 colonies': 'أقل من 5 طوائف', '5 or more colonies': '5 طوائف أو أكثر', 'Percent of colonies lost': 'نسبة الطوائف المفقودة', '% of colonies': '% من الطوائف',
      'Operations with fewer than five colonies lost {a} of their colonies per quarter on average, against {b} for operations with five or more.': 'فقدت المناحل التي تضم أقل من خمس طوائف في المتوسط {a} من طوائفها كل ربع، مقابل {b} للمناحل التي تضم خمسًا أو أكثر.',
      'NASS surveyed operations with fewer than five colonies only from 2015 to 2017, for the United States as a whole. They held about 40,000 to 52,000 colonies.': 'لم تمسح NASS المناحل التي تضم أقل من خمس طوائف إلا من 2015 إلى 2017 وللولايات المتحدة ككل، وكانت تضم نحو 40,000 إلى 52,000 طائفة.',
      'These NASS series exist only for the United States as a whole, so they are shown over time rather than by state.': 'لا تتوفر سلاسل NASS هذه إلا للولايات المتحدة ككل، لذا تُعرض عبر الزمن لا حسب الولاية.',
      'All U.S. series (CSV)': 'كل سلاسل الولايات المتحدة (CSV)', 'Download': 'تنزيل', 'Chart': 'رسم بياني', 'Table': 'جدول', 'Year': 'السنة', 'Quarter': 'الربع', 'Month': 'الشهر',
      'Jan–Mar': 'يناير–مارس', 'Apr–Jun': 'أبريل–يونيو', 'Jul–Sep': 'يوليو–سبتمبر', 'Oct–Dec': 'أكتوبر–ديسمبر'
    }
  };
  function T(s, v) {
    var o = TX[LANG] && TX[LANG][s];
    // then the site's chart labels, then its page texts (download buttons live there)
    if (o == null) { var st = (window.HIVE_LANG || {}).static; o = I.T(s); if (o === s && st && st[s] != null) o = st[s]; }
    return v ? o.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }) : o;
  }
  var N = function (x, d) { return I.N(x, d); };
  var PCT = function (x, d) { return I.PCT ? I.PCT(x, d) : N(x, d) + '%'; };
  var USD = function (s) { return LANG === 'fr' || LANG === 'es' ? s + ' $' : '$' + s; };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var LOCALE = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', ar: 'ar-u-nu-latn', zh: 'zh-CN' }[LANG] || 'en-US';
  var QN = { 1: 'Jan–Mar', 2: 'Apr–Jun', 3: 'Jul–Sep', 4: 'Oct–Dec' };
  function qLabel(k) { var p = k.split('-Q'); return LANG === 'zh' ? p[0] + '年' + T(QN[+p[1]]) : T(QN[+p[1]]) + ' ' + p[0]; }
  function mLabel(k) { var p = k.split('-'); try { return new Date(+p[0], +p[1] - 1, 15).toLocaleDateString(LOCALE, { month: 'short', year: 'numeric' }); } catch (e) { return k; } }
  function niceMax(v) {
    if (!(v > 0)) return { max: 1, step: 0.2 };
    var raw = v / 4, pw = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / pw;
    var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pw;
    return { max: Math.ceil(v / step - 1e-9) * step, step: step };
  }

  /* ---------- One chart: lines or (grouped) bars over an ordered x axis ---------- */
  // spec: { kind: 'line'|'bar', xs: [keys], xLabel: fn(key) -> tooltip label, tick: fn(key, i) -> axis label or '', series: [{ name, cls, values: [..] , dash }], fmt: fn(v), tickFmt: fn(v) }
  function draw(box, spec) {
    // Drawn at the box's own width so text keeps its size on phones
    var W = Math.round(Math.min(900, Math.max(300, box.clientWidth || 760))), H = W < 560 ? 230 : 300, pl = W < 560 ? 44 : 52, pr = 16, pt = 14, pb = 32;
    var wide = W >= 620 && spec.kind === 'line' && spec.series.length > 1;
    if (wide) pr = 150;
    var n = spec.xs.length, top = 0;
    spec.series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) top = Math.max(top, v); }); });
    var nm = niceMax(top), max = nm.max, step = nm.step;
    var band = (W - pl - pr) / n;
    var X = spec.kind === 'bar' ? function (i) { return pl + band * (i + 0.5); } : function (i) { return pl + (n > 1 ? i / (n - 1) : 0.5) * (W - pl - pr); };
    var Y = function (v) { return pt + (1 - v / max) * (H - pt - pb); };
    var g = '<g class="tx-ax">';
    for (var t = 0; t <= max + step / 2; t += step) g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(t).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '"' + (t === 0 ? ' class="base"' : '') + '/><text x="' + (pl - 7) + '" y="' + (Y(t) + 3.5).toFixed(1) + '" text-anchor="end">' + spec.tickFmt(t) + '</text>';
    var lastX = -1e9;
    spec.xs.forEach(function (k, i) { var lab = spec.tick(k, i); if (lab && X(i) - lastX >= 40) { lastX = X(i); g += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(lab) + '</text>'; } });
    g += '</g>';
    var marks = '';
    if (spec.kind === 'line') {
      spec.series.forEach(function (s) {
        var d = '', on = false;
        s.values.forEach(function (v, i) { if (v == null) { on = false; return; } d += (on ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); on = true; });
        marks += '<path class="tx-line ' + s.cls + (s.dash ? ' dash' : '') + '" d="' + d + '"/>';
        if (n <= 30) s.values.forEach(function (v, i) { if (v != null) marks += '<circle class="tx-pt ' + s.cls + '" cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3.2"/>'; });
      });
      if (wide) {
        // direct labels at the line ends, nudged apart so they don't collide
        var ends = spec.series.map(function (s) { var i = s.values.length - 1; while (i >= 0 && s.values[i] == null) i--; return { s: s, y: i >= 0 ? Y(s.values[i]) : null }; }).filter(function (e) { return e.y != null; });
        ends.sort(function (a, b) { return a.y - b.y; });
        for (var k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;
        ends.forEach(function (e) { marks += '<text class="tx-dl" x="' + (W - pr + 8) + '" y="' + (e.y + 4).toFixed(1) + '">' + esc(e.s.name) + '</text>'; });
      }
    } else {
      var m = spec.series.length, gap = 2, bw = Math.max(2, Math.min(28, (band * 0.72 - gap * (m - 1)) / m));
      spec.series.forEach(function (s, j) {
        s.values.forEach(function (v, i) {
          if (v == null) return;
          var x = X(i) - (bw * m + gap * (m - 1)) / 2 + j * (bw + gap), y = Y(v), b = Y(0), r = Math.min(4, bw / 2, b - y);
          marks += '<path class="tx-bar ' + s.cls + '" d="M' + x.toFixed(1) + ' ' + b.toFixed(1) + 'V' + (y + r).toFixed(1) + 'Q' + x.toFixed(1) + ' ' + y.toFixed(1) + ' ' + (x + r).toFixed(1) + ' ' + y.toFixed(1) +
            'H' + (x + bw - r).toFixed(1) + 'Q' + (x + bw).toFixed(1) + ' ' + y.toFixed(1) + ' ' + (x + bw).toFixed(1) + ' ' + (y + r).toFixed(1) + 'V' + b.toFixed(1) + 'Z"/>';
        });
      });
    }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(spec.title) + '" style="direction:ltr">' + g + marks +
      '<line class="tx-cross" x1="0" x2="0" y1="' + pt + '" y2="' + (H - pb) + '" visibility="hidden"/><rect class="tx-hit" x="' + pl + '" y="0" width="' + (W - pl - pr) + '" height="' + (H - pb) + '"/></svg>';
    box.innerHTML = '<div class="tx-plot">' + svg + '<div class="nx-tip" hidden></div></div>';
    var svgEl = box.querySelector('svg'), tip = box.querySelector('.nx-tip'), cross = svgEl.querySelector('.tx-cross');
    function move(cx) {
      var b = svgEl.getBoundingClientRect(), sx = (cx - b.left) / b.width * W;
      var i = spec.kind === 'bar' ? Math.floor((sx - pl) / band) : Math.round((sx - pl) / (W - pl - pr) * (n - 1));
      i = Math.max(0, Math.min(n - 1, i));
      cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('visibility', 'visible');
      tip.innerHTML = '<b>' + esc(spec.xLabel(spec.xs[i])) + '</b>' + spec.series.map(function (s) {
        return '<div><span><i class="tx-key ' + s.cls + (s.dash ? ' dash' : '') + '"></i>' + esc(s.name) + '</span><span>' + (s.values[i] == null ? '–' : spec.fmt(s.values[i])) + '</span></div>';
      }).join('');
      tip.hidden = false;
      var w = tip.offsetWidth, px = X(i) / W * b.width;
      tip.style.left = Math.max(0, Math.min(b.width - w, px - w / 2)) + 'px'; tip.style.top = (-tip.offsetHeight - 6) + 'px';
    }
    svgEl.addEventListener('mousemove', function (e) { move(e.clientX); });
    svgEl.addEventListener('touchstart', function (e) { move(e.touches[0].clientX); }, { passive: true });
    svgEl.addEventListener('touchmove', function (e) { move(e.touches[0].clientX); }, { passive: true });
    svgEl.addEventListener('mouseleave', function () { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
  }
  function legend(series) {
    return series.length < 2 ? '' : '<div class="tx-legend">' + series.map(function (s) { return '<span><i class="tx-key ' + s.cls + (s.dash ? ' dash' : '') + '"></i>' + esc(s.name) + '</span>'; }).join('') + '</div>';
  }
  function table(spec, head) {
    return '<div class="nx-tablewrap"><table class="lx-table"><thead><tr><th>' + esc(head) + '</th>' + spec.series.map(function (s) { return '<th class="num">' + esc(s.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      spec.xs.map(function (k, i) { return '<tr><th>' + esc(spec.xLabel(k)) + '</th>' + spec.series.map(function (s) { return '<td class="num">' + (s.values[i] == null ? '–' : spec.fmt(s.values[i])) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }

  /* ---------- Cards ---------- */
  var cards = [], st = { dollars: 'real', market: 'all', sudden: 'n', mode: {} };
  try { var sv = JSON.parse(localStorage.getItem('hive-tx') || 'null'); if (sv && sv.dollars) st.dollars = sv.dollars; } catch (e) {}
  function seg(id, opts, cur) { return '<div class="seg" role="group" id="' + id + '">' + opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (o[0] === cur) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>'; }
  function card(id, title, controls) {
    cards.push(id);
    return '<div class="lx-card tx-card" id="' + id + '"><div class="nx-cardhead"><h2 class="lx-cardtitle">' + esc(title) + '</h2>' +
      seg(id + '-mode', [['chart', T('Chart')], ['table', T('Table')]], 'chart') + '</div>' +
      (controls || '') + '<p class="tx-take" id="' + id + '-take"></p><div id="' + id + '-legend"></div><div class="tx-box" id="' + id + '-box"></div><p class="nx-note" id="' + id + '-note"></p></div>';
  }
  var $ = function (id) { return document.getElementById(id); };
  var years = function (a, b) { var o = []; for (var y = a; y <= b; y++) o.push(String(y)); return o; };
  var real = function (y) { return st.dollars === 'real' ? (N8.cpi[y] || null) : 1; };

  var html = '<div class="wrap lx-wrap"><p class="lx-small">' + esc(T('These NASS series exist only for the United States as a whole, so they are shown over time rather than by state.')) + '</p>';
  if (SRC === 'honey') {
    html += '<div class="nx-controls"><div class="lx-ctl"><span class="lx-lab">' + esc(T('Prices and values')) + '</span>' + seg('tx-dollars', [['real', T('In {y} dollars', { y: BASE })], ['nominal', T('As reported')]], st.dollars) + '</div></div>';
    html += card('tx-income', T('Income from Honey, Pollination, and Other Hive Products'));
    html += card('tx-price', T('Honey Prices by Color'), '<div class="nx-controls tx-ctl"><div class="lx-ctl"><span class="lx-lab">' + esc(T('Sales')) + '</span>' + seg('tx-market', [['all', T('All sales')], ['retail', T('Retail')], ['wholesale', T('Wholesale')]], 'all') + '</div></div>');
    html += card('tx-parity', T('Honey Price as a Share of Parity'));
  } else {
    html += card('tx-sudden', T('Sudden Colony Loss'), '<div class="nx-controls tx-ctl"><div class="lx-ctl"><span class="lx-lab">' + esc(T('Show')) + '</span>' + seg('tx-sudden-v', [['n', T('Colonies')], ['pct', T('Share of all colonies lost')]], 'n') + '</div></div>');
    html += card('tx-small', T('Small Beekeeping Operations, 2015–2017'));
  }
  html += '<div class="lx-export"><span class="lx-lab">' + esc(T('Download')) + '</span><a class="btn" href="data/nass-national.csv" download>' + esc(T('All U.S. series (CSV)')) + '</a></div></div>';
  host.innerHTML = html;

  function show(id, spec, take, note, head) {
    $(id + '-take').innerHTML = take; $(id + '-note').textContent = note;
    var mode = st.mode[id] || 'chart';
    $(id + '-legend').innerHTML = mode === 'chart' ? legend(spec.series) : '';
    if (mode === 'chart') draw($(id + '-box'), spec); else $(id + '-box').innerHTML = table(spec, head);
  }
  var moneyM = function (v) { return LANG === 'en' ? '$' + N(v / 1e6, v >= 1e8 ? 0 : 1) + ' million' : I.T('${n} million', { n: N(v / 1e6, v >= 1e8 ? 0 : 1) }); };

  function render() {
    if (SRC === 'honey') {
      // 1. Income sources
      var ys = years(2015, 2025).filter(function (y) { return N8.income.pollination[y] != null; });
      var ser = [['honey', 'Honey', 's1'], ['pollination', 'Pollination', 's2'], ['other_products', 'Other hive products', 's3']].map(function (a) {
        return { name: T(a[1]), cls: a[2], values: ys.map(function (y) { var v = N8.income[a[0]][y], f = real(y); return v == null || f == null ? null : v * f; }) };
      });
      var last = ys.length - 1, h = ser[0].values[last], p = ser[1].values[last];
      show('tx-income', { kind: 'line', xs: ys, xLabel: String, tick: function (k) { return k; }, series: ser, title: T('Income from Honey, Pollination, and Other Hive Products'),
        fmt: moneyM, tickFmt: function (v) { return USD(N(v / 1e6)) + (LANG === 'en' ? 'M' : ''); } },
        esc(T('In {y}, beekeepers earned {p} from pollination, {r} of the {h} their honey was worth.', { y: ys[last], p: moneyM(p), r: PCT(Math.round(p / h * 100), 0), h: moneyM(h) })),
        T('Operations with five or more colonies. NASS has reported pollination and other income only since 2015, for the United States as a whole. Other hive products are everything but honey and pollination, such as beeswax, queens, and package bees.') + ' ' +
        (st.dollars === 'real' ? T('<strong>Adjusted for inflation</strong> to {y} dollars with the Consumer Price Index (CPI-U), so years compare fairly.', { y: BASE }).replace(/<[^>]+>/g, '') : ''), T('Year'));
      // 2. Prices by color
      var py = years(2003, 2025);
      var CL = [['white', 'Water white to white', 'c-w'], ['extra_light', 'Extra light amber', 'c-x'], ['amber', 'Light amber to dark amber', 'c-a'], ['other', 'Specialty and other honeys', 'c-o', true]];
      var ps = CL.map(function (c) { return { name: T(c[1]), cls: c[2], dash: c[3], values: py.map(function (y) { var v = (N8.price[c[0] + '|' + st.market] || {})[y], f = real(y); return v == null || f == null ? null : v * f; }) }; });
      var lp = py.length - 1, ranked = [ps[2], ps[1], ps[0]];
      show('tx-price', { kind: 'line', xs: py, xLabel: String, tick: function (k, i) { return i % 4 === 0 || i === py.length - 1 ? k : ''; }, series: ps, title: T('Honey Prices by Color'),
        fmt: function (v) { return USD(N(v, 2)); }, tickFmt: function (v) { return USD(N(v, v % 1 ? 2 : 0)); } },
        esc(T('In {y}, {c} honey sold for {v} a pound and {c2} honey for {v2}.', { y: py[lp], c: ranked[0].name.toLowerCase(), v: USD(N(ranked[0].values[lp], 2)), c2: ranked[2].name.toLowerCase(), v2: USD(N(ranked[2].values[lp], 2)) })),
        T('Price received by beekeepers. Retail is honey they sold to consumers and stores; wholesale is honey sold in bulk to packers and processors. NASS reported color classes from 2003, in cents per pound until 2017.') +
        (st.dollars === 'real' ? ' ' + T('<strong>Adjusted for inflation</strong> to {y} dollars with the Consumer Price Index (CPI-U), so years compare fairly.', { y: BASE }).replace(/<[^>]+>/g, '') : ''), T('Year'));
      // 3. Parity
      var mk = Object.keys(N8.parity).sort(), pv = mk.map(function (k) { return N8.parity[k]; }), lk = mk[mk.length - 1];
      show('tx-parity', { kind: 'line', xs: mk, xLabel: mLabel, tick: function (k) { return /-01$/.test(k) && +k.slice(0, 4) % 3 === 1 ? k.slice(0, 4) : ''; }, series: [{ name: T('Percent of parity'), cls: 's1', values: pv }], title: T('Honey Price as a Share of Parity'),
        fmt: function (v) { return PCT(v, 0); }, tickFmt: function (v) { return PCT(v, 0); } },
        esc(T('In {m}, honey sold at {v} of parity, so a pound of honey bought about {f} of what it did in 1910–1914, measured against what farmers pay.', { m: mLabel(lk), v: PCT(N8.parity[lk], 0), f: PCT(N8.parity[lk], 0) })),
        T('Parity is the price honey would need today to buy as much, relative to what farmers pay for goods, services, interest, taxes and wages, as it did in 1910–1914. NASS publishes it monthly for the United States.'), T('Month'));
    } else {
      // 1. Sudden colony loss, every quarter from the losses survey (gap where NASS published nothing)
      var qs = Object.keys(N8.allLost).concat(Object.keys(N8.sudden)).filter(function (k, i, a) { return a.indexOf(k) === i; }).sort();
      var first = qs[0].split('-Q'), lastq = qs[qs.length - 1].split('-Q'), all = [];
      for (var y = +first[0]; y <= +lastq[0]; y++) for (var q = 1; q <= 4; q++) { var k = y + '-Q' + q; if (k >= qs[0] && k <= qs[qs.length - 1]) all.push(k); }
      var pct = st.sudden === 'pct';
      var vals = all.map(function (k) { var s = N8.sudden[k], a = N8.allLost[k]; return s == null ? null : pct ? (a ? s / a * 100 : null) : s; });
      var lq = all[all.length - 1];
      show('tx-sudden', { kind: 'bar', xs: all, xLabel: qLabel, tick: function (k) { return /-Q1$/.test(k) && +k.slice(0, 4) % 2 === 1 ? k.slice(0, 4) : ''; },
        series: [{ name: pct ? T('Share of all colonies lost') : T('Colonies lost'), cls: 's1', values: vals }], title: T('Sudden Colony Loss'),
        fmt: pct ? function (v) { return PCT(v, 1); } : function (v) { return N(v); }, tickFmt: pct ? function (v) { return PCT(v, 0); } : function (v) { return v >= 1000 ? I.T('{n}k', { n: N(v / 1000) }) : N(v); } },
        esc(T('In {q}, {n} colonies were lost suddenly, {s} of all colonies lost that quarter.', { q: qLabel(lq), n: N(N8.sudden[lq]), s: PCT(N8.sudden[lq] / N8.allLost[lq] * 100, 0) })),
        T('Colonies beekeepers reported lost with all of these signs: few or no dead bees in or near the hive; a quick loss of adult bees although the queen, capped brood and food were still there; robbing of the food absent or delayed; and a loss not explained by Varroa or Nosema. Reported by beekeepers, not confirmed in a lab. U.S. only; no data for April–June 2019.'), T('Quarter'));
      // 2. Small operations vs larger ones
      var sq = Object.keys(N8.small.pct_lost).sort();
      var a = sq.map(function (k) { return N8.small.pct_lost[k]; }), b = sq.map(function (k) { return N8.usPctLost[k]; });
      var avg = function (arr) { var s = 0, c = 0; arr.forEach(function (v) { if (v != null) { s += v; c++; } }); return c ? s / c : null; };
      show('tx-small', { kind: 'bar', xs: sq, xLabel: qLabel, tick: function (k) { return /-Q1$/.test(k) ? k.slice(0, 4) : ''; },
        series: [{ name: T('Fewer than 5 colonies'), cls: 's1', values: a }, { name: T('5 or more colonies'), cls: 's2', values: b }], title: T('Small Beekeeping Operations, 2015–2017'),
        fmt: function (v) { return PCT(v, 0); }, tickFmt: function (v) { return PCT(v, 0); } },
        esc(T('Operations with fewer than five colonies lost {a} of their colonies per quarter on average, against {b} for operations with five or more.', { a: PCT(avg(a), 1), b: PCT(avg(b), 1) })),
        T('NASS surveyed operations with fewer than five colonies only from 2015 to 2017, for the United States as a whole. They held about 40,000 to 52,000 colonies.'), T('Quarter'));
    }
  }

  // Controls
  function bindSeg(id, fn) { var g = $(id); if (!g) return; g.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); fn(b.getAttribute('data-v')); render(); }); }
  bindSeg('tx-dollars', function (v) { st.dollars = v; try { localStorage.setItem('hive-tx', JSON.stringify({ dollars: v })); } catch (e) {} });
  bindSeg('tx-market', function (v) { st.market = v; });
  bindSeg('tx-sudden-v', function (v) { st.sudden = v; });
  cards.forEach(function (id) { bindSeg(id + '-mode', function (v) { st.mode[id] = v; }); });

  // Draw once the tab is first shown (the charts measure their width), and again when the width changes a lot
  var drawnW = 0;
  function maybe() { if (host.hidden) return; var w = host.clientWidth; if (Math.abs(w - drawnW) > 40) { drawnW = w; render(); } }
  new MutationObserver(maybe).observe(host, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('resize', maybe);
  maybe();
})();
