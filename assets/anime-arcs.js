(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ReelAnimeArcs=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Display groups only. Native provider episode keys remain stable for saved watches.
  // Ranges checked 2026-10-11 against the linked official/distributor guides.
  const profiles=[
    {id:'one-piece',names:['one piece'],year:1999,tvmaze:1505,source:'https://one-piece.com/story/index.html',arcs:[
      ['East Blue',1,61],['Alabasta',62,130],['Skypiea',144,195],
      ['Water Seven & Enies Lobby',207,325],['Thriller Bark',337,381],
      ['Sabaody Archipelago',382,405],['Amazon Lily',408,421],['Impel Down',422,458],
      ['Marineford & Post-War',459,516],['Fish-Man Island',517,574],['Punk Hazard',579,628],
      ['Dressrosa',629,746],['Zou',751,779],['Whole Cake Island',783,877],
      ['Reverie',878,891],['Wano Country',892,1088],['Egghead',1089,1155],['Elbaph',1156,null]
    ]},
    {id:'naruto',names:['naruto'],year:2002,tvmaze:495,source:'https://www.crunchyroll.com/news/guides/2023/10/3/naruto-arcs-order-shippuden-boruto',arcs:[
      ['Survival Test',1,5],['Land of Waves',6,19],['Chunin Exams',20,67],
      ['Konoha Crush',68,80],['Search for Tsunade',81,100],['Land of Tea Escort',102,106],
      ['Sasuke Retrieval',107,135],['Land of Rice Fields Investigation',136,141],
      ['Mizuki Tracking',142,147],['Bikochu Search',148,151],['Kurosuki Family Removal',152,157],
      ['Gosunkugi Capture',159,160],['Cursed Warrior Extermination',162,167],['Kaima Capture',169,173],
      ['Buried Gold Excavation',175,176],['Star Guard',178,183],['Peddlers Escort',187,191],
      ['Third Great Beast',195,196],['Konoha Plans Recapture',197,201],['Yakumo Kurama Rescue',203,207],
      ['Gantetsu Escort',209,212],['Menma Memory Search',213,215],['Sunagakure Support',216,220]
    ]},
    {id:'naruto-shippuden',names:['naruto shippuden','naruto shippuuden'],year:2007,tvmaze:488,source:'https://www.crunchyroll.com/news/guides/2023/10/3/naruto-arcs-order-shippuden-boruto',arcs:[
      ['Kazekage Rescue',1,32],['Tenchi Bridge Reconnaissance',33,53],['Twelve Guardian Ninja',54,71],
      ['Akatsuki Suppression',72,88],['Three-Tails Appearance',89,112],['Prophecy & Vengeance',113,143],['Six-Tails Unleashed',144,151],
      ["Pain's Assault",152,175],['Past: Hidden Leaf',176,196],['Five Kage Summit',197,221],
      ['Paradise Life on a Boat',222,242],['Nine-Tails Training & War',243,275],
      ['Seven Ninja Swordsmen',276,289],['Power',290,295],
      ['Fourth Shinobi World War: Confrontation',296,320],['Fourth Shinobi World War: Climax',321,348],
      ["Kakashi's Anbu",349,361],['Fourth Shinobi World War: Climax',362,375],
      ['Ten-Tails Jinchuriki',378,388],['Ten-Tails Jinchuriki',391,393],['Friends’ Paths',394,413],
      ['Ten-Tails Jinchuriki',414,421],['Ten-Tails Jinchuriki',424,431],['Jiraiya Shinobi Handbook',432,450],
      ['Itachi Shinden',451,458],['Kaguya Otsutsuki',459,468],['Kaguya Otsutsuki',470,479],
      ['Childhood',480,483],['Sasuke Shinden',484,488],['Shikamaru Hiden',489,493],['Konoha Hiden',494,500]
    ]}
  ];
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  function profile(title){
    if(title?.type!=='anime')return null;
    const name=normalize(title.title);
    return profiles.find(row=>(Number(title.tvmaze)===row.tvmaze&&(!title.year||Number(title.year)===row.year))||
      (row.names.includes(name)&&(!title.year||Number(title.year)===row.year)))||null;
  }
  return {profile};
});
