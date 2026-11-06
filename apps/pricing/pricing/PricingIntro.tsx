import PricingLanding from "./PricingLanding";
import {navigate} from "../routes";
import {usePricingTheme} from "./usePricingForm";

export default function PricingIntro() {
  const {scheme, toggleColorScheme} = usePricingTheme();
  return (
    <PricingLanding
      description="Check the rate and leverage you qualify for on a DSCR or Fix & Flip loan. BRRRR Loans is a private direct lender for real estate investors nationwide."
      onStart={() => navigate("/pricing/scenario")}
      onToggle={toggleColorScheme}
      scheme={scheme}
      title="See the rate and leverage you qualify for"
    />
  );
}
