export default async function handler(req,res){
  const key=process.env.TRONSCAN_API_KEY;
  const url="https://apilist.tronscanapi.com/api/block?sort=-number&start=0&limit=50";
  try{
    const r=await fetch(url,{headers:key?{"TRON-PRO-API-KEY":key}:{}});
    const text=await r.text();
    res.status(r.status).setHeader("Content-Type","application/json").send(text);
  }catch(e){
    res.status(500).json({error:"TRONSCAN request failed"});
  }
}
