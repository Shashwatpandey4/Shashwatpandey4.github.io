---
title: HR-Analytics-Tools
author: Shashwat Pandey
date: 2023-02-04 11:33:00 +0800
categories: [Data Analytics, Data Visualizations]
tags: [Viz]
pin: true
math: true
mermaid: true
image:
  path: /assets/img/hr/2.png
  
---

# How many job-seekers are there?
First of all, I want to see how many job-seekers there are in our training set.

Do we have a balanced dateset? Or Imbalanced? The answer to these question may influence our models later on.

![](/assets/img/hr/1.png)

We have an imbalanced dataset - that is,cmany more non job-seekers than job-seekers.

This is a problem that we can address later. For now, let's continue exploring the data

# How do the Train & Test set compare to each other?¶
Here I'll show an example of how you can use GridSpec.

GridSpec enables you to plot multiple plots and is highly customisable - a skill worth picking up!

This is really valuable because you can convey a lot of information in a small amount of space.

I'll compare the Train & Test sets here...

![](/assets/img/hr/2.png)

# The Train & Tests sets are similar - that's good news
If the training set has wildy different characteristics to our test set then we really are in for a difficult time.

We'd need to ask if the training population can really help us predict the target.

In this case though, we're fine.

# Now let's focus on the Training set and explore the data...
You'll note that I often incoroprate text in to my visuals. I'll often an annotations to the plots themselves, for example at the 'mean', or at peaks in the data etc.

In this case, I've included an explanation of what we're seeing and what it might mean. This helps your audience to understand your data, but it also helps them to get thinking in a way that is in line with the story you are trying to craft.

![](/assets/img/hr/3.png)

# Let's now explore other factors like company size & employee experience...¶
Do more experienced employees seek new challenges?

Do employees at larger companies feel less valued?

Do employees at smaller companies crave new opportunities?

Both seem plausible. These are the questions that a good EDA can answer!

![](/assets/img/hr/4.png)

It appears the as employee experience increases, they tend to work for larger companies.

Why might this be? Perhaps larger companies pay better, or perhaps more job security.

# Employee Experience & Company Size¶
Is there a noticeable difference between job-seekers and non-job-seekers?

![](/assets/img/hr/5.png)

# Education
We've explored some interesting feautures of our data, including employee experience and company size.

Let's throw education in to the mix.

Do job-seekers have a higher education level? Are they less educated? Or is there no difference at all?

![](/assets/img/hr/6.png)

These results are interesting. It does appear that job-seekers are less educated - I would suggest that this is becuase they are younger and still on their education journey, and are also seeking new challenges.

# Going Deeper
A plot like this is not precise - but it does give viewers a quick overview of a lot of information. It engages the reader, and encourages them to spend time looking at the plot - it gets them thinking.

We see that the vast majority of employees are STEM graduates. These graduates also are also quite well represented at all company sizes.

![](/assets/img/hr/7.png)

# Prediction
The main purpose of the notebook is of course visualization, but I wanted to finish the process with the process of selecting a predictive model

I won't spend much time fine-tuning these models, but as long as we get a fairly decent result, above the Null Accuracy Score, I will be content. I will also visualize the results.

# After Modeling

![](/assets/img/hr/8.png)

# Implementing SMOTE¶
SMOTE is a technique that helps deal with imbalanced data sets.

A great introductory article can be found here:

https://www.geeksforgeeks.org/ml-handling-imbalanced-data-with-smote-and-near-miss-algorithm-in-python/

The common error I see people making is to use SMOTE and THEN split their data in to train & test sets. This is a big mistake as you will get some serious data leakage and end up predicting synthetic results that you have just created - it does not make sense.

Instead, split your data first, and THEN use SMOTE on the training data only.

![](/assets/img/hr/9.png)


<a href="https://github.com/Shashwatpandey4/HR-Analytics-Tool">View Code on github</a>