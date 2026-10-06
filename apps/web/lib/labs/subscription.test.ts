import {it,expect} from 'vitest';
import {getSubscriptionStatus} from '../subscription';
it('unions personal, team and Stripe product entitlements',async()=>{
 const rows:any={users:{call_lab_tier:'pro'},user_agency_assignments:{agency_id:'team'},agencies:{name:'Team',visibility_lab_tier:'pro'},subscriptions:[{product:'discovery-lab-pro',status:'active'}]};
 const db:any={from:(name:string)=>{const q:any={select:()=>q,eq:()=>q,limit:()=>q,single:async()=>({data:rows[name]}),in:async()=>({data:rows[name]})};return q;}};
 const access=await getSubscriptionStatus(db,'owner','owner@example.com');
 expect(access.hasCallLabPro).toBe(true);expect(access.hasDiscoveryLabPro).toBe(true);expect(access.hasVisibilityLabPro).toBe(true);
});
