---
title: Upscaling Low Resolution Images with ESRGAN
author: Shashwat Pandey
date: 2023-04-08 11:33:00 +0800
categories: [Computer Vision, Machine Learning]
tags: [GANs]
pin: true
math: true
mermaid: true
image:
  path: /assets/img/esrgan_output.png
  
---

You know when you have a picture that's not very clear or it looks blurry? Well, ESRGAN is like a magic tool that takes those blurry pictures and turns them into high-quality, clear pictures. It's like making a low-resolution picture look like a high-resolution one.

ESRGAN works by using a special kind of computer program called a neural network. This neural network has two parts: a generator and a discriminator. The generator's job is to create the high-resolution pictures, and the discriminator's job is to tell whether the pictures are real or fake.

![Enhanced Super-Resolution Generative Adversarial Networks](/assets/img/ESRGAN.png)
_Enhanced Super-Resolution Generative Adversarial Network_

First, the program needs to learn how to make good high-resolution pictures. It does this by looking at lots of high-resolution pictures and their low-resolution versions. It learns what details and features should be in the high-resolution pictures based on the low-resolution ones.

Once it has learned, the program enters the next phase called adversarial training. This is where the generator and the discriminator work together to make the pictures even better. The generator tries to create pictures that look real and high-resolution, while the discriminator tries to tell if they are real or fake. They compete against each other, and this competition helps the generator get better at making realistic pictures.

To make sure the pictures look really good, ESRGAN also uses something called perceptual loss. This means the program looks at the details and features of the high-resolution pictures and compares them to the generated pictures. It wants to make sure the generated pictures not only have more pixels but also look like the real thing.

ESRGAN is used in different ways, like improving low-quality pictures from security cameras or making medical images clearer. It's a powerful tool that helps us see more details and make better pictures.

<a href="https://github.com/Shashwatpandey4/ESRGAN">View Implementation on Github</a>