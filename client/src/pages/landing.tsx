import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Calendar, Zap, Shield, BarChart3, Sparkles } from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Task Management",
      description: "Smart categorization, priority suggestions, and intelligent insights",
    },
    {
      icon: Calendar,
      title: "Smart Day Planning",
      description: "AI optimizes your daily schedule for maximum productivity",
    },
    {
      icon: Zap,
      title: "Focus Sprint Sessions",
      description: "Neuro-inclusive productivity sessions with customizable timers",
    },
    {
      icon: Shield,
      title: "Cross-Platform",
      description: "Web and native Android mobile app from a single codebase",
    },
    {
      icon: BarChart3,
      title: "Productivity Analytics",
      description: "ML-based procrastination scoring and personalized insights",
    },
    {
      icon: Sparkles,
      title: "AI Task Decomposition",
      description: "Break down complex tasks into manageable subtasks automatically",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold">TaskSpark AI</h1>
          </div>
          <Button
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Sign In / Sign Up
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Powered by AI
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Intelligent Task Management
            <br />
            <span className="text-primary">Powered by AI</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Organize, prioritize, and accomplish more with TaskSpark AI. 
            Smart categorization, AI-powered insights, and productivity analytics 
            help you work smarter, not harder.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-get-started"
            >
              Get Started Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="button-learn-more"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-16 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Everything you need to stay productive</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              TaskSpark AI combines powerful AI features with an intuitive interface 
              to help you manage tasks effortlessly.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-elevate">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-3xl mb-4">Ready to transform your productivity?</CardTitle>
              <CardDescription className="text-lg mb-6">
                Join thousands of users who are accomplishing more with TaskSpark AI.
                All features included, completely free.
              </CardDescription>
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-cta-signup"
                >
                  Sign Up Now
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 TaskSpark AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
