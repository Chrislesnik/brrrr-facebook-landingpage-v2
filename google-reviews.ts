// Reviews copied from the BRRRR Loans Google Business Profile ("Brrrr.com", Freehold, NJ).
// This list does not update itself. To refresh: copy reviews from the Google listing,
// keep the text verbatim, and update the rating/count to match the profile.

export type GoogleReview = {
  author: string;
  rating: number;
  text: string;
};

export const GOOGLE_RATING = 4.9;
export const GOOGLE_REVIEW_COUNT = 112;

// Opens the reviews panel for the business on Google.
export const GOOGLE_REVIEWS_URL =
  "https://www.google.com/search?q=brrrr.com#lrd=0x89c3d759d8e5835f:0x960568ab40cf35f7,1,,,,";

export const googleReviews: GoogleReview[] = [
  {
    author: "Yvonne Best",
    rating: 5,
    text: "I’ve worked with Varaz/Brrrr Loans on several investment properties, and I honestly couldn’t ask for a better mortgage broker. He’s friendly, professional, and super easy to work with. One of the things I appreciate most is how responsive he is. No matter what time I text him, he gets back to me quickly and always works hard to get the job done.\n\nEverything is explained upfront from the beginning, so there are no surprises along the way. That kind of transparency is extremely important when you’re buying investment properties and trying to make sure the numbers work.\n\nVaraz has helped me finance multiple houses, and I’m always happy to recommend him to other real estate investors. He understands that investors need someone who can move quickly, communicate clearly, and find solutions when things don’t always go exactly as planned.\n\nI’ll definitely be doing more business with Varaz and Brrrr loans in the future. If you’re a real estate investor looking for a broker who understands the investment side of the business and will actually pick up the phone and get things done, I highly recommend giving Varaz a call. He’s someone I trust with my deals, and I’m confident you’ll be glad you reached out to him!",
  },
  {
    author: "Brandon Johnson",
    rating: 5,
    text: "I’ve completed more than 25 deals with Varaz and Brianna, and they have consistently provided excellent service. They are professional, responsive, knowledgeable, and always work hard to keep every deal moving smoothly. They communicate clearly, solve problems quickly, and consistently get us to the closing table. I highly recommend Varaz and Brianna to any real estate investor looking for a reliable lending team!",
  },
  {
    author: "Dary Cabrera",
    rating: 5,
    text: "Varazdat and his team at Brrrr were excellent to work with throughout the refinance process. Communication was always clear, they responded quickly whenever I had a question, and they made the entire process feel smooth and easy. I really appreciated how responsive and professional they were from start to finish. I would definitely recommend Varazdat and his team to anyone looking for a reliable and efficient refinance experience.",
  },
];
