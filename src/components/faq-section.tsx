import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    question: "How accurate are the OSRS drop rate calculations?",
    answer: "Our simulator uses the exact drop mechanics from Old School RuneScape. Drop rates are sourced from the official OSRS Wiki and implement the same weighted table system used in the game, including proper handling of always drops, main table drops, and tertiary drops."
  },
  {
    question: "Can I simulate rare drops like pet drops or unique items?",
    answer: "Yes! Our simulator handles all drop types including tertiary drops like pets, clue scrolls, and rare unique items. Each drop is calculated independently with its correct probability, just like in the actual game."
  },
  {
    question: "How many kills can I simulate at once?",
    answer: "You can simulate anywhere from 1 to 100,000 kills in a single simulation. This allows you to see both short-term variance and long-term expected values for any monster's drop table."
  },
  {
    question: "Why use this instead of other OSRS calculators?",
    answer: "Our tool provides the most comprehensive loot simulation available, with real-time monster search, accurate drop mechanics, visual results, and integration with the OSRS Wiki. It's completely free and works for over 1000 different monsters."
  },
  {
    question: "How do I interpret the simulation results?",
    answer: "The results show both the total quantity of items received and the number of times each item dropped. You can compare the actual drop rate from your simulation with the expected rate to understand variance and probability."
  },
  {
    question: "Are the monster drop tables up to date?",
    answer: "Yes, all drop table data is pulled directly from the OSRS Wiki API, ensuring you always have the most current drop rates and items. The data updates automatically when Jagex makes changes to monster drop tables."
  }
];

export function FAQSection() {
  return (
    <Card className="mt-12">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
        <CardDescription>
          Common questions about OSRS loot simulation and drop rate calculations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {faqs.map((faq, index) => (
          <div key={index} className="border-b last:border-b-0 pb-6 last:pb-0">
            <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
            <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}