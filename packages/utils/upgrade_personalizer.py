"""
Call Lab Pro Upgrade Page - Dynamic Personalization System

This module generates personalized upgrade page copy based on the user's
Call Lab Lite report data. The more specific and personal the copy,
the higher the conversion rate.
"""

from typing import Dict, Optional, List
import re


class UpgradePagePersonalizer:
    """
    Takes data from a Call Lab Lite report and generates personalized
    copy for the Pro upgrade page.
    """

    def __init__(self, lite_report_data: Dict):
        """
        Initialize with data from the user's most recent Lite report.

        Expected data structure:
        {
            'score': 7,
            'max_score': 10,
            'effectiveness': 'Strong discovery, weak close',
            'primary_pattern': {
                'name': 'The Advice Avalanche',
                'type': 'weakness',  # or 'strength'
                'description': 'Tim gave away the entire strategy session...'
            },
            'secondary_pattern': {
                'name': 'The Soft Close Fade',
                'type': 'weakness',
                'description': 'Tim spent 57 minutes building trust, then ended...'
            },
            'buying_signals_detected': 8,
            'missed_close_opportunities': 3,
            'call_duration_minutes': 57,
            'rep_name': 'Tim',
            'prospect_name': 'Marjorie'
        }
        """
        self.data = lite_report_data

    def generate_pain_paragraph(self) -> str:
        """
        Generate the personalized 'You know...' paragraph.

        This is the most critical conversion element - it proves we analyzed
        their actual call and makes the pain visceral.
        """
        score = self.data.get('score', 7)
        max_score = self.data.get('max_score', 10)

        # Extract pattern names and convert to plain language
        primary = self.data.get('primary_pattern', {})
        secondary = self.data.get('secondary_pattern', {})

        primary_plain = self._pattern_to_plain_language(primary)
        secondary_plain = self._pattern_to_plain_language(secondary)

        return f"""You know the call was a {score}/{max_score}. You know you {primary_plain}. You know you {secondary_plain}."""

    def _pattern_to_plain_language(self, pattern: Dict) -> str:
        """
        Convert pattern names to plain language descriptions.

        Example:
        "The Advice Avalanche" -> "gave away the entire strategy session"
        "The Soft Close Fade" -> "ended with 'let me know what you think'"
        """
        name = pattern.get('name', '')
        pattern_type = pattern.get('type', 'weakness')

        # Pattern name -> plain language mapping
        # These should match your actual Lite report patterns
        conversions = {
            'The Advice Avalanche': 'gave away the entire strategy session',
            'The Soft Close Fade': 'ended with "let me know what you think"',
            'The Generosity Trap': 'delivered so much value they don\'t need to hire you',
            'The Peer Validation Engine': 'built massive credibility by showing you get it',
            'The Pricing Intervention': 'diagnosed their underpricing and showed them the ceiling',
            'The Immediate Value Bomb': 'gave them actionable strategy before they paid',
            'The Mirror Close': 'reflected back their potential until they saw themselves differently',
            'The Vulnerability Flip': 'turned their objection into the reason to buy',
            'The Diagnostic Reveal': 'named their problem before they could',
            'The Permission Pattern': 'made the sale feel optional, not urgent',
            'The Premature Solution': 'solved the problem before showing them why it matters',
        }

        # Try exact match first
        if name in conversions:
            return conversions[name]

        # Fall back to generic based on type
        if pattern_type == 'weakness':
            return 'missed key closing moments'
        else:
            return 'built strong rapport'

    def generate_what_you_dont_know(self) -> str:
        """
        Generate the 'What you don't know' section with specific missed opportunities.
        """
        buying_signals = self.data.get('buying_signals_detected', 5)
        missed_closes = self.data.get('missed_close_opportunities', 2)

        examples = []

        # Customize based on actual data
        if buying_signals > 3:
            examples.append(f"Where you missed the BUY signal ({buying_signals} detected, how many did you act on?)")
        else:
            examples.append("Where you missed the BUY signal")

        if missed_closes > 0:
            examples.append(f'where you didn\'t handle the "UH...I DON\'T KNOW IF THIS IS FOR ME" pause ({missed_closes} times)')
        else:
            examples.append('where you didn\'t handle the "UH...I DON\'T KNOW IF THIS IS FOR ME" pause')

        examples.append("or the <strong>exact</strong> moment trust peaked")

        return ", ".join(examples) + "."

    def generate_testimonial_relevance_score(self) -> Dict[str, str]:
        """
        Match the testimonial to the user's specific weakness.

        Different testimonials resonate with different patterns.
        """
        primary = self.data.get('primary_pattern', {}).get('name', '')

        # Map patterns to relevant testimonials
        testimonial_map = {
            'The Advice Avalanche': {
                'quote': "I've been giving away strategy for 18 months. Pro showed me I wasn't building trust—I was eliminating urgency.",
                'attribution': "$2mm performance marketing agency founder"
            },
            'The Soft Close Fade': {
                'quote': "I thought I was being consultative. Pro showed me I was just being scared to ask.",
                'attribution': "$2mm performance marketing agency founder"
            },
            'The Generosity Trap': {
                'quote': "I've been giving away strategy for 18 months. Pro showed me I wasn't building trust—I was eliminating urgency.",
                'attribution': "$2mm performance marketing agency founder"
            },
            'default': {
                'quote': "I've been giving away strategy for 18 months. Pro showed me I wasn't building trust—I was eliminating urgency.",
                'attribution': "$2mm performance marketing agency founder"
            }
        }

        testimonial = testimonial_map.get(primary, testimonial_map['default'])
        return testimonial

    def generate_cta_urgency(self) -> str:
        """
        Generate urgency copy based on how many calls they've already done.

        More calls = more urgency ("you've been doing this wrong for X calls")
        """
        # This would come from user's account data
        total_lite_reports = self.data.get('total_lite_reports_generated', 1)

        if total_lite_reports == 1:
            return "You're already doing the calls."
        elif total_lite_reports <= 3:
            return f"You've analyzed {total_lite_reports} calls. How many more before you fix the pattern?"
        else:
            return f"You've analyzed {total_lite_reports} calls and the pattern is still there."

    def get_full_personalized_copy(self) -> Dict[str, str]:
        """
        Return all personalized copy elements as a dictionary.

        Use this to populate the template variables in the HTML/React component.
        """
        testimonial = self.generate_testimonial_relevance_score()

        return {
            'pain_paragraph': self.generate_pain_paragraph(),
            'what_you_dont_know': self.generate_what_you_dont_know(),
            'testimonial_quote': testimonial['quote'],
            'testimonial_attribution': testimonial['attribution'],
            'cta_urgency': self.generate_cta_urgency(),
            # Also include raw data for additional customization
            'score': f"{self.data.get('score', 7)}/{self.data.get('max_score', 10)}",
            'effectiveness': self.data.get('effectiveness', 'Mixed results'),
        }


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Example: User just got their Lite report
    # This data would come from your database/session

    lite_report_data = {
        'score': 7,
        'max_score': 10,
        'effectiveness': 'Strong discovery, weak close',
        'primary_pattern': {
            'name': 'The Advice Avalanche',
            'type': 'weakness',
            'description': 'Tim gave away the entire strategy session during discovery...'
        },
        'secondary_pattern': {
            'name': 'The Soft Close Fade',
            'type': 'weakness',
            'description': 'Tim spent 57 minutes building trust, then ended with...'
        },
        'buying_signals_detected': 8,
        'missed_close_opportunities': 3,
        'call_duration_minutes': 57,
        'total_lite_reports_generated': 1,
        'rep_name': 'Tim',
        'prospect_name': 'Marjorie'
    }

    # Generate personalized copy
    personalizer = UpgradePagePersonalizer(lite_report_data)
    personalized_copy = personalizer.get_full_personalized_copy()

    # Print results
    print("=" * 80)
    print("PERSONALIZED UPGRADE PAGE COPY")
    print("=" * 80)
    print()
    print("PAIN PARAGRAPH:")
    print(personalized_copy['pain_paragraph'])
    print()
    print("WHAT YOU DON'T KNOW:")
    print(personalized_copy['what_you_dont_know'])
    print()
    print("TESTIMONIAL:")
    print(f'"{personalized_copy["testimonial_quote"]}"')
    print(f"— {personalized_copy['testimonial_attribution']}")
    print()
    print("CTA URGENCY:")
    print(personalized_copy['cta_urgency'])
    print()
    print("=" * 80)

    # This dictionary gets passed to your template engine
    # (Jinja2, Django templates, React props, etc.)
